import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { assertDemoCatalogTarget, populateDemoCatalog } from './demoCatalog.js';

async function main() {
  assertDemoCatalogTarget(env.ERP_ENVIRONMENT, env.MONGODB_DB_NAME);
  await connectDatabase();
  console.log(JSON.stringify(await populateDemoCatalog(env.ERP_ENVIRONMENT)));
}
main().catch(error => {
  // Never log a driver error, a connection string or environment values.
  console.error(error instanceof Error && error.message.startsWith('El catálogo ficticio') ? error.message : 'No se pudo preparar el catálogo demo. Revisa la conexión y la empresa ficticia; no se imprimen credenciales.');
  process.exitCode = 1;
}).finally(async () => { await mongoose.disconnect(); });
