import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
const state = vi.hoisted(() => ({ write: vi.fn() }));
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: (req: any, res: any, next: any) => req.headers.authorization ? next() : res.sendStatus(401) }));
vi.mock('../src/middleware/tenant.js', () => ({ tenant: (req: any, _: any, next: any) => { req.tenant = { companyId: 'company', branchId: 'branch', userId: 'user' }; next(); } }));
vi.mock('../src/middleware/authorize.js', () => ({ authorize: () => (req: any, res: any, next: any) => req.headers.authorization === 'Bearer editor' ? next() : res.sendStatus(403) }));
vi.mock('../src/modules/finanzas/auditedMoneyEntry.js', () => ({ createAuditedMoneyEntry: state.write }));
vi.mock('../src/modules/finanzas/cashMovementService.js', () => ({ createAuditedCashMovement: state.write, pageCashMovements: vi.fn(), listCashMovements: vi.fn() }));
import { createIncomeRoutes } from '../src/modules/finanzas/incomeRoutes.js';
import { createExpenseRoutes } from '../src/modules/finanzas/expenseRoutes.js';
import { createCashMovementRoutes } from '../src/modules/finanzas/cashMovementRoutes.js';
let server: Server; let base: string;
beforeAll(async () => {
  const app = express(); app.use(express.json());
  app.use('/incomes', createIncomeRoutes()); app.use('/expenses', createExpenseRoutes()); app.use('/cash-movements', createCashMovementRoutes());
  app.use((error: any, _: any, res: any, __: any) => res.status(error.statusCode ?? 500).json({ error: error.code }));
  server = app.listen(0); await new Promise<void>(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { state.write.mockReset().mockResolvedValue({ id: 'a'.repeat(24) }); });
describe.each(['incomes', 'expenses', 'cash-movements'])('%s request identity', path => {
  const body = { accountId: 'a'.repeat(24), concept: 'Test entry', amount: 10,
    ...(path === 'cash-movements' ? { type: 'INFLOW', date: '2026-10-14' } : {}) };
  const send = (key?: string, authorization = 'Bearer editor', payload = body) => fetch(base + '/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}),
      ...(key === undefined ? {} : { 'Idempotency-Key': key }) }, body: JSON.stringify(payload)
  });
  it('requires authentication and permission before accepting replays', async () => {
    expect((await send('valid-request-key-123', '')).status).toBe(401);
    expect((await send('valid-request-key-123', 'Bearer reader')).status).toBe(403);
    expect(state.write).not.toHaveBeenCalled();
  });
  it('rejects absent, malformed and oversized keys without writing', async () => {
    for (const key of [undefined, 'short', 'invalid request key', 'a'.repeat(101)]) expect((await send(key)).status).toBe(400);
    expect(state.write).not.toHaveBeenCalled();
  });
  it('passes the key with server-derived scope to the transactional service', async () => {
    expect((await send('valid-request-key-123')).status).toBe(201);
    const args = state.write.mock.calls[0];
    const input = args[path === 'cash-movements' ? 0 : 1];
    const actor = args[path === 'cash-movements' ? 1 : 2];
    expect(input).toMatchObject({ companyId: 'company', branchId: 'branch' });
    expect(actor).toMatchObject({ userId: 'user', requestKey: 'valid-request-key-123' });
  });
});
