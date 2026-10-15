import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFinanceRetry, financeRetryScope, type FinanceRetryStorage } from '../../../shared/utils/financeRetry';

const payload = { accountId: 'account', concept: 'Electricidad', amount: 100, type: 'OUTFLOW', date: '2026-10-14' };
function fixture() {
  const rows = new Map<string, string>();
  const storage: FinanceRetryStorage = { read: async name => rows.get(name) ?? null,
    write: async (name, value) => { rows.set(name, value); }, remove: async name => { rows.delete(name); } };
  let sequence = 0;
  return { rows, storage, make: () => createFinanceRetry(storage, () => `test-request-key-${++sequence}`) };
}
test('lost responses, concurrent retries and screen reloads keep the same key until confirmation', async () => {
  const { make, rows } = fixture();
  const client = make();
  const [first, second] = await Promise.all([client.key('scope', payload), client.key('scope', payload)]);
  assert.equal(first, second);
  assert.equal(await make().key('scope', { ...payload }), first);
  assert.equal(await make().key('scope', Object.fromEntries(Object.entries(payload).reverse())), first);
  assert.equal([...rows.values()].some(value => value.includes('Electricidad')), false);
  await client.confirmed('scope', payload, first);
  assert.notEqual(await client.key('scope', payload), first);
});
test('payload and tenant scopes do not share pending requests; stale acknowledgements cannot clear newer keys', async () => {
  const { make, rows } = fixture(); const client = make();
  const first = await client.key('scope', payload);
  assert.notEqual(await client.key('other-scope', payload), first);
  assert.notEqual(await client.key('scope', { ...payload, amount: 200 }), first);
  await client.confirmed('scope', payload, 'stale-request-key');
  assert.equal(await client.key('scope', payload), first);
  assert.equal(rows.size, 3);
});
test('storage failures and corrupted pending keys fail before sending a request', async () => {
  const client = createFinanceRetry({ read: async () => null, write: async () => { throw new Error('Storage unavailable'); }, remove: async () => {} });
  await assert.rejects(client.key('scope', payload), /Storage unavailable/);
  const corrupt = createFinanceRetry({ read: async () => 'bad', write: async () => {}, remove: async () => {} });
  await assert.rejects(corrupt.key('scope', payload), /identificador pendiente/);
});
test('renewing a token keeps user/company/branch identity; tenant changes separate it', () => {
  const token = (claims: object) => 'header.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature';
  const claims = { sub: 'user', companyId: 'company', branchId: 'branch' };
  const first = financeRetryScope('https://erp.example/', token({ ...claims, exp: 1 }));
  assert.equal(financeRetryScope('https://erp.example', token({ ...claims, exp: 2 })), first);
  assert.notEqual(financeRetryScope('https://erp.example', token({ ...claims, branchId: 'other' })), first);
  assert.throws(() => financeRetryScope('https://erp.example', 'invalid'));
});
