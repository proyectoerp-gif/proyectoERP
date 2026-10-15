// Standard MongoDB archive, encrypted at rest; restore is ONLY to an owned localhost process.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, join, sep } from 'node:path';
import { mkdir, mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setServers, promises as dns } from 'node:dns';
import dotenv from 'dotenv';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { encryptArchive, decryptArchive } from './backup-crypto.mjs';

const require = createRequire(import.meta.url);
const { MongoClient, BSON } = require('mongodb');
const run = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: join(root, '.env') });
const backupRoot = join(root, 'backups');
const keyRoot = join(root, '.backup-keys');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let scratch, replicaSet, source, restored;
let phase = 'preparation';
const verifyFile = process.argv[2];
if (verifyFile && (verifyFile !== '--verify' || !process.argv[3] || process.argv.length !== 4)) {
  console.error('Uso: backup:local [--verify ruta-del-archivo.erpbackup]');
  process.exitCode = 1;
} else {

async function protect(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const identity = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
    await run('icacls.exe', [directory, '/inheritance:r', '/grant:r', `${identity}:(OI)(CI)F`], { windowsHide: true });
  }
}
async function fingerprint(db) {
  const result = {};
  const collections = await db.listCollections({}, { nameOnly: false }).toArray();
  for (const collection of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    if (collection.type !== 'collection' || collection.name.startsWith('system.')) {
      throw new Error('Unsupported collection type; use Atlas managed backups');
    }
    const hash = createHash('sha256');
    let count = 0;
    for await (const row of db.collection(collection.name).find({}).sort({ _id: 1 })) {
      hash.update(BSON.serialize(row)); count++;
    }
    const indexes = (await db.collection(collection.name).listIndexes().toArray())
      .map(({ ns, ...index }) => index).sort((a, b) => a.name.localeCompare(b.name));
    const { uuid, ...info } = collection.info ?? {};
    result[collection.name] = { count, sha256: hash.digest('hex'), indexes, options: collection.options, info };
  }
  return result;
}
async function tool(name, args) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const executable = process.env.MONGODB_TOOLS_DIR
    ? join(resolve(process.env.MONGODB_TOOLS_DIR), name + suffix) : name + suffix;
  // Capture output: driver errors can contain connection strings or customer data.
  await run(executable, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 600000 });
}
try {
  const uri = process.env.MONGODB_URI;
  const database = process.env.MONGODB_DB_NAME;
  if (!verifyFile && (!uri || !database || !/^[a-zA-Z0-9_-]+$/.test(database))) throw new Error('Missing database configuration');
  if (process.env.MONGODB_DNS_SERVERS) setServers(process.env.MONGODB_DNS_SERVERS.split(',').map(x => x.trim()));
  await protect(backupRoot); await protect(keyRoot);
  scratch = await mkdtemp(join(backupRoot, '.work-'));
  await protect(scratch);
  const keyPath = join(keyRoot, 'local-backup.key');
  try { await access(keyPath); } catch {
    if (verifyFile) throw new Error('Backup key missing');
    await writeFile(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 });
  }
  const key = await readFile(keyPath);
  if (key.length !== 32) throw new Error('Invalid backup key');
  let before, restoreDatabase = database;
  let encrypted = join(backupRoot, `erp-${stamp}.erpbackup`);
  if (verifyFile) {
    encrypted = resolve(process.argv[3]);
    if (!encrypted.endsWith('.erpbackup')) throw new Error('Invalid archive path');
    const previousReport = JSON.parse(await readFile(encrypted.replace(/\.erpbackup$/, '.report.json'), 'utf8'));
    before = previousReport.inventory;
    restoreDatabase = previousReport.database;
    if (!before || !/^[a-zA-Z0-9_-]+$/.test(restoreDatabase)) throw new Error('Backup inventory missing');
  } else {
  source = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, promoteValues: false });
  await source.connect();
  const db = source.db(database);
  phase = 'source inventory';
  before = await fingerprint(db);
  // Resolve SRV with the same configured DNS as the API; Go tools otherwise use Windows DNS.
  let toolUri = uri;
  if (uri.startsWith('mongodb+srv://')) {
    const parsed = new URL(uri);
    const hosts = await dns.resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
    const txt = (await dns.resolveTxt(parsed.hostname)).map(parts => parts.join('')).join('&');
    const options = new URLSearchParams(txt);
    for (const [key, value] of parsed.searchParams) options.set(key, value);
    options.set('tls', 'true');
    toolUri = uri.replace('mongodb+srv://', 'mongodb://').split('?')[0]
      .replace(parsed.hostname, hosts.map(host => `${host.name}:${host.port}`).join(',')) + '?' + options;
  }
  const config = join(scratch, 'connection.json');
  await writeFile(config, JSON.stringify({ uri: toolUri }), { mode: 0o600, flag: 'wx' });
  const archive = join(scratch, 'database.archive.gz');
  phase = 'mongodump';
  console.log('Creando archivo MongoDB; no se mostrarán credenciales ni documentos.');
  await tool('mongodump', ['--config', config, '--db', database, '--gzip', `--archive=${archive}`]);
  await rm(config);
  const after = await fingerprint(db);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during backup; retry when idle');
  phase = 'encryption';
  await encryptArchive(archive, encrypted, key);
  await rm(archive);
  }
  const decrypted = join(scratch, 'restore.archive.gz');
  await decryptArchive(encrypted, decrypted, key);
  phase = 'isolated restore';
  // Never accept an environment-supplied restore URI or a user-owned MongoDB process.
  for (const key of Object.keys(process.env)) if (key.startsWith('MONGOMS_')) delete process.env[key];
  const downloadDir = join(root, 'node_modules', '.cache', 'mongodb-stock-tests');
  process.env.MONGOMS_DOWNLOAD_DIR = downloadDir;
  process.env.MONGOMS_PREFER_GLOBAL_PATH = 'false';
  replicaSet = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir },
    instanceOpts: [{ launchTimeout: 60000 }],
    replSet: { count: 1, ip: '127.0.0.1', storageEngine: 'wiredTiger' } });
  const localUri = replicaSet.getUri();
  if (!localUri.startsWith('mongodb://127.0.0.1:')) throw new Error('Unsafe restore destination');
  await tool('mongorestore', ['--uri', localUri, '--gzip', `--archive=${decrypted}`, '--stopOnError']);
  restored = new MongoClient(localUri, { promoteValues: false });
  await restored.connect();
  const actual = await fingerprint(restored.db(restoreDatabase));
  if (JSON.stringify(before) !== JSON.stringify(actual)) throw new Error('Restored documents or indexes differ');
  const report = { version: 1, createdAt: new Date().toISOString(), archive: encrypted.split(sep).pop(),
    encrypted: 'AES-256-GCM', restoreVerified: true, destination: 'isolated-localhost',
    collections: Object.keys(actual).length,
    documents: Object.values(actual).reduce((sum, row) => sum + row.count, 0),
    documentsAndIndexesMatch: true, consistency: 'quiescent-content-match-not-point-in-time',
    offsite: false, scheduled: false };
  const reportFile = verifyFile ? `verification-${stamp}.report.json` : `erp-${stamp}.report.json`;
  await writeFile(join(backupRoot, reportFile), JSON.stringify({ ...report, database: restoreDatabase, inventory: actual }, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  console.log('Guarda por separado la clave de .backup-keys; sin ella no se puede recuperar el archivo.');
} catch {
  console.error(`No se completó el respaldo verificado (fase: ${phase}). No se alteró Atlas. Revisa configuración, herramientas, conectividad y que la base esté sin actividad.`);
  process.exitCode = 1;
} finally {
  await restored?.close().catch(() => undefined);
  await source?.close().catch(() => undefined);
  await replicaSet?.stop();
  if (scratch && resolve(scratch).startsWith(resolve(backupRoot) + sep)) await rm(scratch, { recursive: true, force: true });
}
}
