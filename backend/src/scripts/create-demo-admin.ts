import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { createDemoOrganization, demoOrganization } from './demoSetup.js';

function askPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    return Promise.reject(new Error('Ejecuta el comando en una terminal interactiva.'));
  }
  process.stdout.write(prompt);
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\u0003') { finish(); reject(new Error('Operación cancelada.')); return; }
        if (char === '\r' || char === '\n') { finish(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') { value = [...value].slice(0, -1).join(''); }
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log('Alta inicial ficticia en la base: ' + env.MONGODB_DB_NAME);
  if (env.MONGODB_DB_NAME !== 'erp_app') {
    throw new Error('Para esta instalación configura MONGODB_DB_NAME=erp_app en tu .env, igual que en Render.');
  }
  console.log('Empresa: ' + demoOrganization.companyName);
  console.log('Sucursal: ' + demoOrganization.branchName + ' — ' + demoOrganization.city);
  console.log('Correo de acceso: ' + demoOrganization.email);
  const password = await askPassword('Tu contraseña (mínimo 12 caracteres; no se muestra): ');
  if (password !== await askPassword('Repite tu contraseña: ')) throw new Error('Las contraseñas no coinciden.');
  await connectDatabase();
  await createDemoOrganization(password);
  console.log('Empresa, sucursal y administrador creados correctamente.');
  console.log('Inicia sesión en https://proyectoerp-web.onrender.com con ' + demoOrganization.email);
}

main().catch(() => {
  // Driver errors can include connection credentials; never print the raw error.
  console.error('No se pudo completar el alta. Comprueba la conexión, la base erp_app, las contraseñas y que no existan usuarios ni la empresa demo.');
  process.exitCode = 1;
}).finally(async () => { await mongoose.disconnect(); });
