import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasModulePermission, canSettleCommercial } from '../../../shared/constants/modulePermissions';
import { updateTransactionStatusRequest } from '../src/transactionApi';

test('navigation and settlement distinguish user, commercial, inventory and finance grants', () => {
  for (const module of ['sales', 'purchases', 'inventory', 'finance', 'production', 'roles', 'organization']) {
    assert.equal(hasModulePermission(['usuarios.ver', 'usuarios.editar'], module), false);
  }
  assert.equal(hasModulePermission(['ventas.crear'], 'sales', 'crear'), true);
  assert.equal(hasModulePermission(['ventas.crear'], 'sales', 'editar'), false);
  assert.equal(hasModulePermission(['ventas.ver'], 'purchases'), false);
  assert.equal(hasModulePermission(['usuarios.ver'], 'users'), true);
  const permissions = ['ventas.liquidar', 'inventario.editar', 'finanzas.editar'];
  assert.equal(canSettleCommercial(permissions, 'sales'), true);
  assert.equal(canSettleCommercial(permissions, 'purchase-orders'), false);
  for (let i = 0; i < permissions.length; i++) assert.equal(canSettleCommercial(permissions.filter((_, j) => j !== i), 'sales'), false);
});
test('web rejects manual payment and receipt before making a request', async t => {
  const original = globalThis.fetch; let calls = 0;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected request'); };
  const row = { id: 'a'.repeat(24), partnerId: 'b'.repeat(24), productId: 'c'.repeat(24), quantity: 1, unitPrice: 10, total: 10, status: 'PENDIENTE' };
  await assert.rejects(updateTransactionStatusRequest('https://test', 'token', 'sales', row, 'PAGADA', new AbortController().signal), /no está permitido/);
  await assert.rejects(updateTransactionStatusRequest('https://test', 'token', 'purchase-orders', { ...row, status: 'APROBADA' }, 'RECIBIDA', new AbortController().signal), /no está permitido/);
  assert.equal(calls, 0);
});
