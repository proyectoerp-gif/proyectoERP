import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
vi.hoisted(() => { process.env.JWT_SECRET = 'local-access-tests-only-'.repeat(4); });
import { createAppRouter } from '../src/routes/index.js';
import { signToken } from '../src/security/jwt.js';
import { hashPassword } from '../src/security/password.js';
import { getUserModel } from '../src/modules/usuarios/models/User.js';
import { getRoleModel } from '../src/modules/roles/models/Role.js';
import { getCustomerModel } from '../src/modules/clientes/models/Customer.js';
import { getProductModel } from '../src/modules/productos/models/Product.js';
import { getCategoryModel } from '../src/modules/productos/models/Category.js';
import { getSaleModel } from '../src/modules/ventas/models/Sale.js';
import { getBankAccountModel, getCashMovementModel } from '../src/modules/finanzas/models/FinanceModels.js';
import { getReportModel } from '../src/modules/reportes/models/Report.js';
import { getAuditEventModel } from '../src/modules/auditoria/models/AuditEvent.js';

const uri = process.env.STOCK_TEST_MONGODB_URI;
const database = `codex_access_test_${randomUUID().replaceAll('-', '')}`;
let owned = false, server: Server | undefined, base = '';
const tenants = [{ companyId: 'access-company-a', branchId: 'branch-a1' },
  { companyId: 'access-company-a', branchId: 'branch-a2' }, { companyId: 'access-company-b', branchId: 'branch-b1' }];
const records: { customer: string; product: string; sale: string; account: string }[] = [];
const sessions: Record<string, { token: string; id: string; permissions: string[] }> = {};
const read = ['auth.profile', 'dashboard.ver', 'reportes.ver', 'clientes.ver', 'ventas.ver', 'productos.ver'];
async function request(actor: string, path: string, method = 'GET', payload?: unknown, headers: Record<string,string> = {}) {
  return fetch(base + path, { method, headers: { ...(actor ? { Authorization: 'Bearer ' + sessions[actor].token } : {}),
    'Content-Type': 'application/json', ...headers }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
}
beforeAll(async () => {
  if (!uri || !/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri)) throw new Error('An explicit isolated localhost replica set is required.');
  await mongoose.connect(uri, { dbName: database, autoIndex: true, serverSelectionTimeoutMS: 5000 });
  if (mongoose.connection.db?.databaseName !== database) throw new Error('Unexpected test database');
  owned = true;
  const app = express(); app.use(express.json()); app.use(createAppRouter());
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode ?? 500).json({ ok: false, error: error.code ?? 'INTERNAL' }));
  server = app.listen(0); await new Promise<void>(resolve => server!.once('listening', resolve));
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  const password = 'Local-test-only-password-2026!';
  const passwordHash = await hashPassword(password);
  for (const [index, scope] of tenants.entries()) {
    const customer = await getCustomerModel().create({ ...scope, name: `Tenant customer ${index}`, taxId: `ACCESS-${index}`, email: `customer-${index}@example.test` });
    const category = await getCategoryModel().create({ companyId: scope.companyId, name: `Category ${index}`, code: `ACCESS-${index}` });
    const product = await getProductModel().create({ companyId: scope.companyId, categoryId: String(category._id), name: `Product ${index}`, sku: `ACCESS-${index}`, price: 11 });
    const sale = await getSaleModel().create({ ...scope, customerId: String(customer._id), productId: String(product._id), quantity: 1, unitPrice: 11 * (index + 1), total: 11 * (index + 1) });
    const account = await getBankAccountModel().create({ ...scope, name: `Account ${index}`, bankName: 'Test bank', iban: `LOCALACCESS${index}` });
    await getCashMovementModel().create({ ...scope, accountId: String(account._id), concept: `Cash ${index}`, amount: 101 * (index + 1), type: 'INFLOW', date: new Date().toISOString().slice(0, 10) });
    records.push({ customer: String(customer._id), product: String(product._id), sale: String(sale._id), account: String(account._id) });
  }
  for (const [name, tenantIndex, permissions] of [
    ['reader', 0, read], ['branch', 1, read], ['foreign', 2, read],
    ['finance', 0, ['auth.profile','dashboard.ver','reportes.ver','finanzas.ver']],
    ['dashboard', 0, ['auth.profile','dashboard.ver','reportes.ver']],
    ['editor', 0, [...read,'clientes.editar','ventas.crear']],
    ['revoked', 0, read],
    ['manager', 0, ['auth.profile','usuarios.ver','usuarios.crear','usuarios.editar','roles.ver','roles.editar']]
  ] as [string, number, string[]][]) {
    const scope = tenants[tenantIndex];
    const role = await getRoleModel().create({ companyId: scope.companyId, name: `ACCESS-${name}`, description: 'Local HTTP integration role', permissions });
    const user = await getUserModel().create({ ...scope, name, email: `${name}@access.example.test`, passwordHash, roleId: String(role._id), permissions, sessionVersion: 0 });
    const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) });
    expect(login.status).toBe(200);
    const { data } = await login.json();
    sessions[name] = { token: data.token, id: String(user._id), permissions };
  }
});
afterAll(async () => {
  try {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (owned && mongoose.connection.db?.databaseName === database && /^codex_access_test_[a-f0-9]{32}$/.test(database)) await mongoose.connection.db.dropDatabase();
  } finally { await mongoose.disconnect(); }
});

describe('real HTTP roles, JWT sessions and MongoDB tenant isolation', () => {
  it.each([['reader',0],['branch',1],['foreign',2]] as const)('%s reads only its own branch and company', async (actor, index) => {
    for (const path of ['/customers','/sales']) {
      const response = await request(actor,path); expect(response.status).toBe(200);
      const { data } = await response.json(); expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject(tenants[index]);
    }
    const products = await (await request(actor,'/products')).json();
    expect(products.data.every((row:any) => row.companyId === tenants[index].companyId)).toBe(true);
    expect(products.data).toHaveLength(index === 2 ? 1 : 2); // Catalog is intentionally company-wide.
  });
  it('reader grants cannot write through any major business router', async () => {
    const before = await getAuditEventModel().countDocuments({ action: { $ne: 'LOGIN' } });
    for (const path of ['/customers','/suppliers','/products','/sales','/purchase-orders','/stock/receipts','/stock/issues','/stock/transfers','/bank-accounts','/cash-movements','/incomes','/expenses','/users','/roles','/departments','/invoices','/production/orders']) {
      expect((await request('reader', path, 'POST', {})).status, path).toBe(403);
    }
    expect(await getAuditEventModel().countDocuments({ action: { $ne: 'LOGIN' } })).toBe(before);
  });
  it('aggregate routes do not reveal financial, purchasing or personnel figures to a sales reader', async () => {
    const { data } = await (await request('reader','/dashboard/summary')).json();
    expect(data.metrics).toEqual({ sales: 11, purchases: null, cash: null, employees: null, inventory: 2 });
    const widgets = await (await request('reader','/dashboard/widgets')).json();
    expect(widgets.data.some((row:any) => row.id === 'widget-finance')).toBe(false);
    const finance = await (await request('finance','/dashboard/summary')).json();
    expect(finance.data.metrics).toEqual({ sales: null, purchases: null, cash: 101, employees: null, inventory: null });
    const empty = await (await request('dashboard','/dashboard/summary')).json();
    expect(Object.values(empty.data.metrics).every(value => value === null)).toBe(true);
  });
  it('report previews and persisted snapshots require source-domain access', async () => {
    expect((await request('reader','/reports/preview?type=cash-flow&period=month')).status).toBe(403);
    expect((await request('finance','/reports/preview?type=sales&period=month')).status).toBe(403);
    expect((await request('dashboard','/reports/preview?type=sales&period=month')).status).toBe(403);
    const preview = await (await request('reader','/reports/preview?type=sales&period=month')).json();
    expect(preview.data.metrics.total).toBe(11);
    await getReportModel().create([{ ...tenants[0], userId: sessions.reader.id, name: 'Sales snapshot', type: 'sales', period: 'month', data: { total: 11 } },
      { ...tenants[0], userId: sessions.finance.id, name: 'Private cash snapshot', type: 'cash-flow', period: 'month', data: { balance: 101 } },
      { ...tenants[1], userId: sessions.branch.id, name: 'Other branch', type: 'sales', period: 'month', data: { total: 22 } }]);
    const reports = await (await request('reader','/reports')).json();
    expect(reports.data.map((row:any) => row.name)).toEqual(['Sales snapshot']);
    expect((await (await request('dashboard','/reports')).json()).data).toEqual([]);
    expect((await request('reader','/reports','POST',{name:'Forbidden cash',type:'financial',period:'month'})).status).toBe(403);
  });
  it('scope headers and query strings cannot select another tenant', async () => {
    const response = await request('reader','/customers?companyId=access-company-b&branchId=branch-b1','GET',undefined,
      {'X-Company-Id':'access-company-b','X-Branch-Id':'branch-b1'});
    const { data } = await response.json(); expect(data).toHaveLength(1); expect(data[0].id).toBe(records[0].customer);
    expect((await request('reader','/customers/page?companyId=access-company-b')).status).toBe(400);
  });
  it('an editor cannot change foreign records, inject scope or use cross-tenant references', async () => {
    const edit = { name:'Unauthorized rename', taxId:'ACCESS-EDIT', email:'edit@example.test' };
    for (const index of [1,2]) {
      expect((await request('editor','/customers/'+records[index].customer,'PATCH',edit)).status).toBe(404);
      expect((await request('editor','/sales','POST',{customerId:records[index].customer,productId:records[0].product,quantity:1})).status).toBe(400);
    }
    expect((await request('editor','/customers','POST',{...edit,companyId:tenants[2].companyId})).status).toBe(400);
    expect((await request('editor','/sales','POST',{customerId:records[0].customer,productId:records[2].product,quantity:1})).status).toBe(400);
    expect(await getCustomerModel().countDocuments({ name: edit.name })).toBe(0);
    expect(await getSaleModel().countDocuments({ companyId:tenants[0].companyId,branchId:tenants[0].branchId })).toBe(1);
  });
  it('current database grants override old embedded JWT permissions immediately', async () => {
    await getUserModel().updateOne({_id:sessions.revoked.id},{$set:{permissions:['auth.profile']}});
    expect((await request('revoked','/sales')).status).toBe(403);
    const forgedGrants = signToken({sub:sessions.reader.id,...tenants[0],sessionVersion:0,permissions:['finanzas.ver','usuarios.editar']});
    expect((await request('reader','/cash-movements','GET',undefined,{Authorization:'Bearer '+forgedGrants})).status).toBe(403);
  });
  it('a delegated user administrator cannot grant ADMIN privileges or mutate another branch', async () => {
    expect((await request('manager','/users','POST',{name:'Escalated user',email:'escalated@access.example.test',password:'Test-only-password-2026!',roleId:'role-admin-demo'})).status).toBe(403);
    expect((await request('manager','/roles','POST',{name:'ESCALATION',description:'Forbidden grant',permissions:['usuarios.editar','finanzas.editar']})).status).toBe(403);
    expect((await request('manager','/users/'+sessions.branch.id+'/name','PATCH',{name:'Foreign rename',expectedName:'branch'})).status).toBe(409);
    expect((await getUserModel().findById(sessions.branch.id).lean())?.name).toBe('branch');
    expect(await getUserModel().countDocuments({email:'escalated@access.example.test'})).toBe(0);
    const directory = await (await request('manager','/users')).json();
    for (const row of directory.data) {
      expect(row).toMatchObject(tenants[0]);
      for (const field of ['passwordHash','sessionVersion','emailVerificationHash','emailVerificationEmail']) expect(row).not.toHaveProperty(field);
    }
  });
  it('revoked, disabled, tampered or tenant-switched sessions are rejected', async () => {
    await getUserModel().updateOne({_id:sessions.revoked.id},{$inc:{sessionVersion:1}});
    expect((await request('revoked','/auth/profile')).status).toBe(401);
    await getUserModel().updateOne({_id:sessions.revoked.id},{$set:{isActive:false,sessionVersion:0}});
    expect((await request('revoked','/auth/profile')).status).toBe(401);
    const wrongTenant = signToken({sub:sessions.reader.id,...tenants[2],sessionVersion:0});
    expect((await request('reader','/sales','GET',undefined,{Authorization:'Bearer '+wrongTenant})).status).toBe(401);
    expect((await request('reader','/sales','GET',undefined,{Authorization:'Bearer '+sessions.reader.token+'invalid'})).status).toBe(401);
    expect((await request('','/sales')).status).toBe(401);
  });
});
