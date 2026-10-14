import mongoose from 'mongoose';
import { getRoleModel } from '../modules/roles/models/Role.js';
import { getUserModel } from '../modules/usuarios/models/User.js';
import { getAuditEventModel } from '../modules/auditoria/models/AuditEvent.js';
import { resolveRolePermissions } from '../modules/roles/roleService.js';
import { demoOrganization } from './demoSetup.js';

export async function migrateDemoPermissions() {
  const roles = getRoleModel(), users = getUserModel(), audit = getAuditEventModel();
  await Promise.all([roles.init(), users.init(), audit.init()]);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const d = demoOrganization;
      const admin = await users.findOne({ companyId: d.companyId, branchId: d.branchId, email: d.email, isActive: true }).session(session).lean().exec();
      if (!admin) throw new Error('No existe el administrador inicial demo activo.');
      const initialSetup = await audit.exists({ companyId: d.companyId, branchId: d.branchId, userId: String(admin._id), action: 'CREATE', module: 'configuracion', 'details.initialSetup': true }).session(session);
      const role = await roles.findOne({ _id: admin.roleId, companyId: d.companyId, name: 'ADMINISTRADOR_DEMO', isSystem: false, isActive: true }).session(session).lean().exec();
      if (!initialSetup || !role) throw new Error('El usuario y su rol no corresponden al alta demo original.');
      const permissions = [...new Set([...role.permissions, ...resolveRolePermissions('ADMIN')])].sort();
      if (JSON.stringify([...role.permissions].sort()) === JSON.stringify(permissions)) return { changed: false, affectedUsers: 0 };
      await roles.updateOne({ _id: role._id, companyId: d.companyId }, { $set: { permissions }, $inc: { __v: 1 } }, { session });
      const affected = await users.updateMany({ companyId: d.companyId, roleId: String(role._id) }, { $set: { permissions }, $inc: { sessionVersion: 1 } }, { session });
      await audit.create([{
        companyId: d.companyId, branchId: d.branchId, userId: String(admin._id), action: 'UPDATE', module: 'roles', entityId: String(role._id),
        details: { permissionMigration: 'domain-v1', previousPermissions: role.permissions, permissions, affectedUsers: affected.modifiedCount, sessionsRevoked: true }
      }], { session });
      return { changed: true, affectedUsers: affected.modifiedCount };
    });
  } finally { await session.endSession(); }
}
