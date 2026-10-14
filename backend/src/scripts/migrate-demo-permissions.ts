import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { migrateDemoPermissions } from './demoPermissionMigration.js';

async function main() {
  if (env.MONGODB_DB_NAME !== 'erp_app') throw new Error('La migración demo requiere la base erp_app.');
  await connectDatabase();
  console.log(JSON.stringify(await migrateDemoPermissions()));
}
main().catch(() => {
  console.error('No se pudo migrar el administrador demo. Revisa conexión, base y alta inicial; no se imprime el error del driver.');
  process.exitCode = 1;
}).finally(async () => { await mongoose.disconnect(); });
