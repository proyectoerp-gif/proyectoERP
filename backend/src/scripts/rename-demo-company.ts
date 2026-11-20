import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { renameLegacyDemoCompanyName } from '../modules/empresas/legacyDemoCompanyName.js';

async function main() {
  if (env.ERP_ENVIRONMENT !== 'demo' || env.MONGODB_DB_NAME !== 'erp_app') {
    throw new Error('El cambio de nombre solo puede ejecutarse en la empresa demo de erp_app.');
  }
  await connectDatabase();
  const changed = await renameLegacyDemoCompanyName();
  process.stdout.write(changed ? 'Empresa actualizada: Up!.\n' : 'No se encontró el nombre heredado que debía actualizarse.\n');
}

main().catch(error => {
  process.stderr.write((error instanceof Error ? error.message : 'No se pudo actualizar la empresa.') + '\n');
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => undefined);
});
