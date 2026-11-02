import {readFile} from 'node:fs/promises';
const report=await readFile(new URL('../../backups/scheduled-status.json',import.meta.url),'utf8').then(JSON.parse).catch(()=>null);
const recent=report?.verifiedAt&&Date.now()-Date.parse(report.verifiedAt)<36*3600000;
if(!report?.localVerified||!recent){console.error('ALERTA: no hay un respaldo verificado en las últimas 36 horas.');process.exitCode=1;}
else console.log('Respaldo local reciente verificado.');
if(!report?.offsite){console.error('PENDIENTE: no se ha acreditado una copia externa y una clave recuperable por separado.');process.exitCode=1;}
