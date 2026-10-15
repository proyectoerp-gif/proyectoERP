import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { assertDemoAllowed } from '../config/environmentSafety.js';
import { loadModuleManifests } from '../core/moduleRegistry.js';
import { getCompanyModel } from '../modules/empresas/models/Company.js';
import { getBranchModel } from '../modules/empresas/models/Branch.js';
import { getRoleModel } from '../modules/roles/models/Role.js';
import { resolveRolePermissions } from '../modules/roles/roleService.js';
import { getUserModel } from '../modules/usuarios/models/User.js';
import { getAuditEventModel } from '../modules/auditoria/models/AuditEvent.js';
import { hashPassword } from '../security/password.js';

export const demoOrganization = {
  companyId: 'company-promaxima-demo',
  companyName: 'Promaxima Demo — empresa ficticia',
  taxId: 'DEMO-PROMAXIMA',
  branchId: 'branch-promaxima-demo',
  branchName: 'Sucursal de pruebas',
  branchCode: 'DEMO-01',
  city: 'Ciudad de México',
  adminName: 'Administrador de pruebas',
  email: 'admin@promaxima.example'
} as const;

export async function createDemoOrganization(password: string) {
  assertDemoAllowed(env.ERP_ENVIRONMENT);
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes UTF-8.');
  }
  const company = getCompanyModel(), branch = getBranchModel(), role = getRoleModel();
  const user = getUserModel(), audit = getAuditEventModel();
  await Promise.all([company.init(), branch.init(), role.init(), user.init(), audit.init()]);
  const passwordHash = await hashPassword(password);
  const permissions = [...new Set([
    ...resolveRolePermissions('ADMIN'),
    ...loadModuleManifests().flatMap(module => module.permissions)
  ])].sort();
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      if (await user.countDocuments({}).session(session).exec() !== 0) {
        throw new Error('La base ya contiene usuarios. No se modificó ningún acceso existente.');
      }
      const d = demoOrganization;
      // The fixed company primary key also prevents two concurrent initializations.
      await company.create([{ _id: d.companyId, name: d.companyName, taxId: d.taxId, status: 'ACTIVE' }], { session });
      await branch.create([{ _id: d.branchId, companyId: d.companyId, name: d.branchName, code: d.branchCode, city: d.city, isActive: true }], { session });
      const [createdRole] = await role.create([{
        companyId: d.companyId, name: 'ADMINISTRADOR_DEMO', description: 'Administrador inicial del entorno ficticio',
        permissions, isSystem: false, isActive: true
      }], { session });
      const [createdUser] = await user.create([{
        name: d.adminName, email: d.email, companyId: d.companyId, branchId: d.branchId,
        roleId: String(createdRole._id), permissions, passwordHash, isActive: true
      }], { session });
      await audit.create([{
        userId: String(createdUser._id), companyId: d.companyId, branchId: d.branchId,
        action: 'CREATE', module: 'configuracion', entityId: d.companyId,
        details: { demo: true, initialSetup: true, branchId: d.branchId, roleId: String(createdRole._id) }
      }], { session });
      return { companyId: d.companyId, branchId: d.branchId, email: d.email };
    });
  } finally {
    await session.endSession();
  }
}
