import dotenv from 'dotenv';
import {spawn} from 'node:child_process';
import {open,mkdir,readFile,writeFile,copyFile,unlink,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),directory=join(root,'backups');
dotenv.config({path:join(root,'.env')});
await mkdir(directory,{recursive:true});
let lock;
try{lock=await open(join(directory,'.scheduled.lock'),'wx');}catch{console.error('Otro respaldo está en ejecución; revisa el bloqueo si el proceso anterior terminó inesperadamente.');process.exit(1);}
const status={attemptedAt:new Date().toISOString(),localVerified:false,offsite:false,externalPending:!process.env.BACKUP_EXTERNAL_DIRECTORY};
try{
 const env={...process.env,NODE_USE_SYSTEM_CA:'1'};
 if(!env.MONGODB_TOOLS_DIR){const tools=await readdir(join(root,'.tools')).catch(()=>[]);const found=tools.find(v=>v.startsWith('mongodb-database-tools-'));if(found)env.MONGODB_TOOLS_DIR=join(root,'.tools',found,'bin');}
 const code=await new Promise((done,fail)=>{const child=spawn(process.execPath,[join(root,'backend/scripts/backup-local.mjs')],{cwd:root,env,windowsHide:true,stdio:['ignore','ignore','ignore']});child.on('error',fail);child.on('exit',done);});
 if(code!==0)throw Error('El respaldo o la restauración local no se confirmaron.');
 const reports=(await readdir(directory)).filter(v=>/^erp-[\dTZ.-]+\.report\.json$/.test(v)).sort().reverse();
 const report=JSON.parse(await readFile(join(directory,reports[0]),'utf8'));
 if(!report.restoreVerified||!report.documentsAndIndexesMatch||!/^erp-[\dTZ.-]+\.erpbackup$/.test(report.archive))throw Error('No existe evidencia de restauración verificada.');
 Object.assign(status,{localVerified:true,archive:report.archive,verifiedAt:report.createdAt});
 if(env.BACKUP_EXTERNAL_DIRECTORY){
  const destination=resolve(env.BACKUP_EXTERNAL_DIRECTORY);
  if(destination.toLowerCase().startsWith(root.toLowerCase()))throw Error('El destino externo debe quedar fuera del proyecto.');
  await mkdir(destination,{recursive:true});
  await copyFile(join(directory,report.archive),join(destination,report.archive));
  await copyFile(join(directory,reports[0]),join(destination,reports[0]));
  // Copying to a directory is evidence of a copy, not proof that a cloud sync completed.
  Object.assign(status,{externalCopy:true,externalPending:false,offsite:false});
 }
 console.log(status.localVerified?'Respaldo cifrado y restauración local confirmados.':'Respaldo no confirmado.');
 if(status.externalPending)console.log('Pendiente: destino externo y copia separada de la clave.');
}catch{status.error='Respaldo no confirmado. Revisa conexión, herramientas y el registro de estado.';process.exitCode=1;console.error(status.error);}
finally{await writeFile(join(directory,'scheduled-status.json'),JSON.stringify(status,null,2));await lock.close();await unlink(join(directory,'.scheduled.lock'));}
