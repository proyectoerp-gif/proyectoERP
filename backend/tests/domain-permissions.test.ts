import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
const state = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn() }));
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: (req: any, res: any, next: any) => {
  if (!req.headers.authorization) return res.sendStatus(401);
  req.user = { id: 'actor', permissions: req.headers.authorization.replace('Bearer ', '').split(',') }; next();
} }));
vi.mock('../src/middleware/tenant.js', () => ({ tenant: (req: any, _: any, next: any) => { req.tenant = { companyId: 'co', branchId: 'br', userId: 'actor' }; next(); } }));
vi.mock('../src/core/commercialCreation.js', () => ({ createAuditedSale: state.write, createAuditedPurchaseOrder: state.write, updateAuditedSaleStatus: state.write, updateAuditedPurchaseOrderStatus: state.write }));
vi.mock('../src/modules/ventas/saleService.js', () => ({ listSales: state.read, pageSales: state.read }));
vi.mock('../src/modules/compras/purchaseOrderService.js', () => ({ listPurchaseOrders: state.read, pagePurchaseOrders: state.read }));
import { createSaleRoutes } from '../src/modules/ventas/saleRoutes.js';
import { createPurchaseOrderRoutes } from '../src/modules/compras/purchaseOrderRoutes.js';
import { authorizeSettlement } from '../src/middleware/authorizeSettlement.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { authorize } from '../src/middleware/authorize.js';
import { createAppRouter } from '../src/routes/index.js';
let server: Server, base: string;
beforeAll(async () => {
  state.write.mockResolvedValue({ id: 'record' }); state.read.mockResolvedValue([]);
  const app = express(); app.use(express.json());
  app.use('/sales', createSaleRoutes()); app.use('/purchase-orders', createPurchaseOrderRoutes());
  app.use('/api', createAppRouter());
  app.post('/settle', authenticate, authorizeSettlement(true), (_req, res) => res.sendStatus(204));
  app.get('/receipt', authenticate, authorizeSettlement(false), (_req, res) => res.sendStatus(204));
  for (const domain of ['inventario', 'finanzas', 'produccion', 'roles', 'productos', 'clientes', 'proveedores', 'empresas', 'departamentos', 'facturacion', 'calidad', 'mantenimiento', 'activos', 'soporte', 'riesgo', 'cumplimiento']) {
    app.post('/guard/' + domain, authenticate, authorize(domain + '.editar'), (_req, res) => res.sendStatus(204));
  }
  app.use((error: any, _: any, res: any, __: any) => res.status(error.statusCode ?? 500).json({ error: error.code }));
  server = app.listen(0); await new Promise<void>(resolve => server.once('listening', resolve)); base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
const request = (path: string, permissions: string[], body?: unknown) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + permissions.join(','), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

it('user administration grants cannot read/create sales or purchases', async () => {
  state.write.mockClear(); state.read.mockClear();
  for (const path of ['/sales', '/purchase-orders']) {
    expect((await request(path, ['usuarios.ver', 'usuarios.editar'])).status).toBe(403);
    expect((await request(path, ['usuarios.editar'], {})).status).toBe(403);
  }
  expect(state.write).not.toHaveBeenCalled(); expect(state.read).not.toHaveBeenCalled();
});
it('commercial reads and creation require their own domain, without granting editing', async () => {
  for (const [path, domain, partner] of [['/sales', 'ventas', 'customerId'], ['/purchase-orders', 'compras', 'supplierId']]) {
    expect((await request(path, [domain + '.ver'])).status).toBe(200);
    expect((await request(path, [domain + '.editar'], { [partner]: 'a'.repeat(24), productId: 'b'.repeat(24), quantity: 1, ...(domain === 'compras' ? { unitCost: 10 } : {}) })).status).toBe(403);
    expect((await request(path, [domain + '.crear'], { [partner]: 'a'.repeat(24), productId: 'b'.repeat(24), quantity: 1, ...(domain === 'compras' ? { unitCost: 10 } : {}) })).status).toBe(201);
  }
});
it('settlement requires the corresponding commercial grant, inventory and finance together', async () => {
  for (const [kind, domain] of [['sales', 'ventas'], ['purchase-orders', 'compras']]) {
    const permissions = [domain + '.liquidar', 'inventario.editar', 'finanzas.editar'];
    for (let index = 0; index < permissions.length; index++) expect((await request('/settle', permissions.filter((_, i) => i !== index), { kind })).status).toBe(403);
    expect((await request('/settle', ['usuarios.editar'], { kind })).status).toBe(403);
    expect((await request('/settle', permissions, { kind })).status).toBe(204);
    expect((await request('/receipt?kind=' + kind, [domain + '.ver'])).status).toBe(204);
    expect((await request('/receipt?kind=' + kind, [domain === 'ventas' ? 'compras.ver' : 'ventas.ver'])).status).toBe(403);
  }
  expect((await request('/settle', ['usuarios.editar'], { kind: ['sales', 'purchase-orders'] })).status).toBe(400);
});
it('domain writes never inherit user-management grants', async () => {
  for (const domain of ['inventario', 'finanzas', 'produccion', 'roles', 'productos', 'clientes', 'proveedores', 'empresas', 'departamentos', 'facturacion', 'calidad', 'mantenimiento', 'activos', 'soporte', 'riesgo', 'cumplimiento']) {
    expect((await request('/guard/' + domain, ['usuarios.editar'], {})).status).toBe(403);
    expect((await request('/guard/' + domain, [domain + '.editar'], {})).status).toBe(204);
  }
});
it('registered ERP routes deny user-management-only accounts before accessing business data', async () => {
  for (const path of ['/sales', '/purchase-orders', '/stock', '/bank-accounts', '/cash-movements', '/products', '/customers', '/suppliers', '/roles', '/departments', '/invoices', '/companies/current', '/production/orders', '/maintenance/summary', '/quality/summary', '/risk-management/summary']) {
    expect((await request('/api' + path, ['usuarios.ver', 'usuarios.editar'])).status, path).toBe(403);
  }
  for (const path of ['/sales', '/purchase-orders', '/stock/receipts', '/stock/issues', '/stock/transfers', '/bank-accounts', '/cash-movements', '/products', '/customers', '/suppliers', '/roles', '/departments', '/invoices', '/production/orders']) {
    expect((await request('/api' + path, ['usuarios.editar'], {})).status, path).toBe(403);
  }
});
it('manual terminal transitions are rejected before the persistence service', async () => {
  state.write.mockClear();
  for (const [path, domain, from, to] of [['/sales', 'ventas', 'PENDIENTE', 'PAGADA'], ['/purchase-orders', 'compras', 'APROBADA', 'RECIBIDA']]) {
    const response = await fetch(base + path + '/' + 'a'.repeat(24) + '/status', { method: 'PATCH', headers: { Authorization: 'Bearer ' + domain + '.editar', 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedStatus: from, status: to }) });
    expect(response.status).toBe(400);
  }
  expect(state.write).not.toHaveBeenCalled();
});
