import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

const magic = Buffer.from('ERPBACK1');
export async function encryptArchive(source, destination, key) {
  if (key.length !== 32) throw new Error('Invalid backup key');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const file = await open(destination, 'wx', 0o600);
  try { await file.write(Buffer.concat([magic, iv])); } finally { await file.close(); }
  await pipeline(createReadStream(source), cipher, createWriteStream(destination, { flags: 'a' }));
  const output = await open(destination, 'a');
  try { await output.write(cipher.getAuthTag()); } finally { await output.close(); }
}

export async function decryptArchive(source, destination, key) {
  const size = (await stat(source)).size;
  if (key.length !== 32 || size < 36) throw new Error('Invalid encrypted backup');
  const input = await open(source, 'r');
  const header = Buffer.alloc(20);
  const tag = Buffer.alloc(16);
  try {
    await input.read(header, 0, 20, 0);
    await input.read(tag, 0, 16, size - 16);
  } finally { await input.close(); }
  if (!header.subarray(0, 8).equals(magic)) throw new Error('Invalid backup format');
  const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(8));
  decipher.setAuthTag(tag);
  await pipeline(createReadStream(source, { start: 20, end: size - 17 }), decipher,
    createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
}
