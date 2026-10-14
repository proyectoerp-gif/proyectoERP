import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasModulePermission, canSettleCommercial } from '../../../shared/constants/modulePermissions';
import { updateTransactionStatusRequest } from '../src/transactionApi';
test('mobile commercial controls separate creation, state changes and settlement', () => {
  assert.equal(hasModulePermission(['compras.crear'], 'purchase-orders', 'crear'), true);
  assert.equal(hasModulePermission(['compras.crear'], 'purchase-orders', 'editar'), false);
  assert.equal(canSettleCommercial(['compras.editar'], 'purchase-orders'), false);
  assert.equal(canSettleCommercial(['compras.liquidar', 'inventario.editar', 'finanzas.editar'], 'purchase-orders'), true);
  assert.equal(canSettleCommercial(['usuarios.editar', 'inventario.editar', 'finanzas.editar'], 'purchase-orders'), false);
});
test('mobile rejects manual terminal states before sending a request', async t => {
  const original = globalThis.fetch; let calls = 0;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected request'); };
  const row = { id: 'a'.repeat(24), partnerId: 'b'.repeat(24), productId: 'c'.repeat(24), quantity: 1, unitPrice: 10, total: 10, status: 'PENDIENTE' };
  await assert.rejects(updateTransactionStatusRequest('https://test', 'token', 'sales', row, 'PAGADA', new AbortController().signal), /no está permitido/);
  await assert.rejects(updateTransactionStatusRequest('https://test', 'token', 'purchase-orders', { ...row, status: 'APROBADA' }, 'RECIBIDA', new AbortController().signal), /no está permitido/);
  assert.equal(calls, 0);
});
