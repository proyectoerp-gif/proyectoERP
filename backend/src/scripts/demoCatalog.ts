import mongoose from 'mongoose';
import { demoScope } from '../modules/demoSupport/knowledge.js';
import { getCompanyModel } from '../modules/empresas/models/Company.js';
import { getBranchModel } from '../modules/empresas/models/Branch.js';
import { getCategoryModel } from '../modules/productos/models/Category.js';
import { getProductModel } from '../modules/productos/models/Product.js';
import { getAuditEventModel } from '../modules/auditoria/models/AuditEvent.js';

export const demoCatalog = [
  { code: 'ALB-OFI', name: 'Mobiliario de oficina', products: [
    { sku: 'ALB-SIL-001', name: 'Silla ergonómica Nube', price: 1499 },
    { sku: 'ALB-ESC-002', name: 'Escritorio compacto Alba', price: 2490 },
    { sku: 'ALB-REP-003', name: 'Repisa de escritorio Roble', price: 590 }
  ] },
  { code: 'ALB-PAP', name: 'Papelería creativa', products: [
    { sku: 'ALB-LIB-004', name: 'Libreta de ideas A5', price: 129 },
    { sku: 'ALB-SET-005', name: 'Set de escritura Horizonte', price: 189 },
    { sku: 'ALB-PLA-006', name: 'Planificador semanal Brisa', price: 159 }
  ] },
  { code: 'ALB-ORG', name: 'Organización y almacenamiento', products: [
    { sku: 'ALB-ORG-007', name: 'Organizador modular de escritorio', price: 349 },
    { sku: 'ALB-CAJ-008', name: 'Caja organizadora de tela', price: 229 },
    { sku: 'ALB-ARC-009', name: 'Archivador de sobremesa', price: 279 }
  ] },
  { code: 'ALB-HOG', name: 'Iluminación y hogar', products: [
    { sku: 'ALB-LAM-010', name: 'Lámpara de escritorio Aurora', price: 649 },
    { sku: 'ALB-REL-011', name: 'Reloj de pared Claro', price: 399 },
    { sku: 'ALB-MAC-012', name: 'Maceta decorativa Semilla', price: 199 }
  ] }
] as const;

export function assertDemoCatalogTarget(environment: string, database: string | undefined) {
  if (!['demo', 'test'].includes(environment) || database !== 'erp_app') throw new Error('El catálogo ficticio requiere el entorno demo y la base erp_app.');
}

export async function populateDemoCatalog(environment: string) {
  assertDemoCatalogTarget(environment, mongoose.connection.db?.databaseName);
  const company = getCompanyModel(), branch = getBranchModel(), category = getCategoryModel(), product = getProductModel(), audit = getAuditEventModel();
  await Promise.all([company.init(), branch.init(), category.init(), product.init(), audit.init()]);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const existing = await company.findOne({ _id: demoScope.companyId, status: 'ACTIVE' }).session(session);
      const demoBranch = await branch.findOne({ _id: demoScope.branchId, companyId: demoScope.companyId, isActive: true }).session(session);
      if (!existing || !demoBranch) throw new Error('No existe la empresa ficticia activa. No se modificaron otros registros.');
      const name = 'Albor Oficina y Hogar — empresa ficticia';
      const renamed = existing.name !== name;
      if (renamed) await company.updateOne({ _id: existing._id, name: existing.name }, { $set: { name, taxId: 'DEMO-ALBOR' } }, { session, runValidators: true });
      let categoriesCreated = 0, productsCreated = 0;
      for (const entry of demoCatalog) {
        let current = await category.findOne({ companyId: demoScope.companyId, code: entry.code }).session(session);
        if (!current) { [current] = await category.create([{ companyId: demoScope.companyId, code: entry.code, name: entry.name, status: 'ACTIVE' }], { session }); categoriesCreated++; }
        if (current.status !== 'ACTIVE') throw new Error('Una categoría de ejemplo fue retirada; se conserva su estado y se cancela la carga.');
        for (const example of entry.products) {
          const result = await product.updateOne({ companyId: demoScope.companyId, sku: example.sku }, { $setOnInsert: { ...example, companyId: demoScope.companyId, categoryId: String(current._id), status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } }, { upsert: true, session, runValidators: true, timestamps: false });
          productsCreated += result.upsertedCount;
        }
      }
      if (renamed || categoriesCreated || productsCreated) await audit.create([{ ...demoScope, userId: 'system:demo-catalog', action: 'UPDATE', module: 'productos', entityId: demoScope.companyId, details: { demo: true, operation: 'albor-catalog-v1', renamed, categoriesCreated, productsCreated } }], { session });
      return { company: name, renamed, categoriesCreated, productsCreated };
    });
  } finally { await session.endSession(); }
}
