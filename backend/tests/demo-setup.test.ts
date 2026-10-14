import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  company: { init: vi.fn(), create: vi.fn() },
  branch: { init: vi.fn(), create: vi.fn() },
  role: { init: vi.fn(), create: vi.fn() },
  user: { init: vi.fn(), create: vi.fn(), countDocuments: vi.fn() },
  audit: { init: vi.fn(), create: vi.fn() },
  count: vi.fn(), hash: vi.fn(), end: vi.fn(), start: vi.fn(), transaction: vi.fn()
}));
vi.mock('../src/modules/empresas/models/Company.js', () => ({ getCompanyModel: () => state.company }));
vi.mock('../src/modules/empresas/models/Branch.js', () => ({ getBranchModel: () => state.branch }));
vi.mock('../src/modules/roles/models/Role.js', () => ({ getRoleModel: () => state.role }));
vi.mock('../src/modules/usuarios/models/User.js', () => ({ getUserModel: () => state.user }));
vi.mock('../src/modules/auditoria/models/AuditEvent.js', () => ({ getAuditEventModel: () => state.audit }));
vi.mock('../src/security/password.js', () => ({ hashPassword: state.hash }));
vi.mock('mongoose', async original => {
  const actual = await original<typeof import('mongoose')>();
  return { ...actual, default: { ...actual.default, startSession: state.start } };
});

import { createDemoOrganization, demoOrganization } from '../src/scripts/demoSetup.js';

const session = { withTransaction: state.transaction, endSession: state.end };
beforeEach(() => {
  vi.resetAllMocks();
  state.start.mockResolvedValue(session);
  state.transaction.mockImplementation(async callback => callback());
  state.user.countDocuments.mockReturnValue({ session: () => ({ exec: state.count }) });
  state.count.mockResolvedValue(0);
  state.hash.mockResolvedValue('hashed-password');
  state.role.create.mockResolvedValue([{ _id: 'role-id' }]);
  state.user.create.mockResolvedValue([{ _id: 'user-id' }]);
});

describe('initial fictitious organization', () => {
  it('rejects short and oversized UTF-8 passwords before any database access', async () => {
    for (const password of ['short', 'ñ'.repeat(37)]) {
      await expect(createDemoOrganization(password)).rejects.toThrow('contraseña');
    }
    expect(state.user.init).not.toHaveBeenCalled();
    expect(state.start).not.toHaveBeenCalled();
  });

  it('refuses existing users and does not replace their access or create an organization', async () => {
    state.count.mockResolvedValue(1);
    await expect(createDemoOrganization('test-only-password')).rejects.toThrow('ya contiene usuarios');
    expect(state.company.create).not.toHaveBeenCalled();
    expect(state.user.create).not.toHaveBeenCalled();
    expect(state.end).toHaveBeenCalledOnce();
  });

  it('links all records in one transaction, grants production access and keeps plaintext out of writes', async () => {
    const result = await createDemoOrganization('test-only-password');
    expect(result.email).toBe(demoOrganization.email);
    for (const model of [state.company, state.branch, state.role, state.user, state.audit]) {
      expect(model.create).toHaveBeenCalledWith(expect.any(Array), { session });
    }
    const saved = state.user.create.mock.calls[0][0][0];
    expect(saved).toMatchObject({ companyId: demoOrganization.companyId, branchId: demoOrganization.branchId, roleId: 'role-id', passwordHash: 'hashed-password' });
    expect(saved.permissions).toEqual(expect.arrayContaining(['usuarios.editar', 'produccion.ver', 'auth.profile']));
    expect(state.audit.create.mock.calls[0][0][0].userId).toBe('user-id');
    expect(JSON.stringify([state.user.create.mock.calls, state.audit.create.mock.calls])).not.toContain('test-only-password');
    expect(state.end).toHaveBeenCalledOnce();
  });

  it('propagates audit failure through the transaction and always closes the session', async () => {
    state.audit.create.mockRejectedValue(new Error('audit unavailable'));
    await expect(createDemoOrganization('test-only-password')).rejects.toThrow('audit unavailable');
    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.end).toHaveBeenCalledOnce();
  });
});
