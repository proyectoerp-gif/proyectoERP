import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  role: { init: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() },
  user: { init: vi.fn(), findOne: vi.fn(), updateMany: vi.fn() },
  audit: { init: vi.fn(), exists: vi.fn(), create: vi.fn() },
  findRole: vi.fn(), findUser: vi.fn(), original: vi.fn(), start: vi.fn(), end: vi.fn(), transaction: vi.fn()
}));
vi.mock('../src/modules/roles/models/Role.js', () => ({ getRoleModel: () => state.role }));
vi.mock('../src/modules/usuarios/models/User.js', () => ({ getUserModel: () => state.user }));
vi.mock('../src/modules/auditoria/models/AuditEvent.js', () => ({ getAuditEventModel: () => state.audit }));
vi.mock('mongoose', async original => { const actual = await original<typeof import('mongoose')>(); return { ...actual, default: { ...actual.default, startSession: state.start } }; });
import { migrateDemoPermissions } from '../src/scripts/demoPermissionMigration.js';
import { resolveRolePermissions } from '../src/modules/roles/roleService.js';
const session = { withTransaction: state.transaction, endSession: state.end };
beforeEach(() => {
  vi.resetAllMocks(); state.start.mockResolvedValue(session); state.transaction.mockImplementation(async callback => callback());
  state.user.findOne.mockReturnValue({ session: () => ({ lean: () => ({ exec: state.findUser }) }) });
  state.role.findOne.mockReturnValue({ session: () => ({ lean: () => ({ exec: state.findRole }) }) });
  state.audit.exists.mockReturnValue({ session: state.original });
  state.findUser.mockResolvedValue({ _id: 'admin', roleId: 'role' });
  state.findRole.mockResolvedValue({ _id: 'role', permissions: ['usuarios.editar'] });
  state.original.mockResolvedValue({ _id: 'initial-audit' }); state.user.updateMany.mockResolvedValue({ modifiedCount: 1 });
});
it('does not grant permissions without evidence of the original demo setup', async () => {
  state.original.mockResolvedValue(null);
  await expect(migrateDemoPermissions()).rejects.toThrow('alta demo original');
  expect(state.role.updateOne).not.toHaveBeenCalled(); expect(state.user.updateMany).not.toHaveBeenCalled(); expect(state.end).toHaveBeenCalledOnce();
});
it('updates only the original demo role, revokes its sessions, and audits in the same transaction', async () => {
  expect(await migrateDemoPermissions()).toEqual({ changed: true, affectedUsers: 1 });
  expect(state.role.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: 'role', companyId: 'company-promaxima-demo', name: 'ADMINISTRADOR_DEMO', isSystem: false, isActive: true }));
  expect(state.user.updateMany).toHaveBeenCalledWith({ companyId: 'company-promaxima-demo', roleId: 'role' }, expect.objectContaining({ $inc: { sessionVersion: 1 }, $set: { permissions: expect.arrayContaining(['ventas.liquidar', 'compras.liquidar', 'finanzas.editar', 'inventario.editar']) } }), { session });
  expect(state.audit.create).toHaveBeenCalledWith([expect.objectContaining({ details: expect.objectContaining({ sessionsRevoked: true, affectedUsers: 1 }) })], { session });
});
it('is idempotent and does not revoke sessions or add audit events twice', async () => {
  state.findRole.mockResolvedValue({ _id: 'role', permissions: resolveRolePermissions('ADMIN') });
  expect(await migrateDemoPermissions()).toEqual({ changed: false, affectedUsers: 0 });
  expect(state.user.updateMany).not.toHaveBeenCalled(); expect(state.audit.create).not.toHaveBeenCalled();
});
