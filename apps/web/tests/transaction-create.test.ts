import {createFinanceRetry} from '../../../shared/utils/financeRetry';
const retryValues=new Map<string,string>();const testRetry=createFinanceRetry({read:async k=>retryValues.get(k)??null,write:async(k,v)=>{retryValues.set(k,v);},remove:async k=>{retryValues.delete(k);}},()=>crypto.randomUUID());
const createTransactionRequest=(...args:Parameters<typeof createWithStorage>)=>createWithStorage(args[0],args[1],args[2],args[3],args[4],testRetry);
const testStorage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>testStorage.get(k)??null,setItem:(k:string,v:string)=>testStorage.set(k,v),removeItem:(k:string)=>testStorage.delete(k)}});
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTransactionRequest as createWithStorage, transactionsRequest, validateTransaction } from '../src/transactionApi';
const draft = { partnerId: 'a'.repeat(24), productId: 'b'.repeat(24), quantity: '2', unitCost: '10.00' };
test('transaction validation rejects invalid identifiers, precision and overflow', () => {
  assert.deepEqual(validateTransaction('sales', draft), { customerId: draft.partnerId, productId: draft.productId, quantity: 2 });
  for (const quantity of ['0', '-1', '1e2', '0.0000001', '']) assert.throws(() => validateTransaction('sales', { ...draft, quantity }));
  for (const unitCost of ['-1', '', '1.001', '1e2']) assert.throws(() => validateTransaction('purchase-orders', { ...draft, unitCost }));
  assert.throws(() => validateTransaction('sales', { ...draft, partnerId: 'invalid' }));
});
test('purchase creation confirms fields, authorization and pending status', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://example.test/purchase-orders');
    assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer test.eyJzdWIiOiJhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJjb21wYW55SWQiOiJjbyIsImJyYW5jaElkIjoiYnIifQ.signature");
    const payload = JSON.parse(String(options?.body)); assert.equal(payload.unitCost, 10); assert.equal(payload.companyId, undefined);
    return new Response(JSON.stringify({ data: { ...payload, id: 'record', total: 20, status: 'PENDIENTE' } }));
  };
  assert.equal((await createTransactionRequest('https://example.test', "test.eyJzdWIiOiJhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJjb21wYW55SWQiOiJjbyIsImJyYW5jaElkIjoiYnIifQ.signature", 'purchase-orders', draft, new AbortController().signal)).total, 20);
});
test('ambiguous creates warn before retry and reads reject malformed or duplicate records', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { throw new Error('network'); };
  await assert.rejects(createTransactionRequest('https://example.test', "test.eyJzdWIiOiJhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJjb21wYW55SWQiOiJjbyIsImJyYW5jaElkIjoiYnIifQ.signature", 'sales', draft, new AbortController().signal), /podría haberse registrado/);
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ id: 'x' }] }));
  await assert.rejects(transactionsRequest('https://example.test', "test.eyJzdWIiOiJhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJjb21wYW55SWQiOiJjbyIsImJyYW5jaElkIjoiYnIifQ.signature", 'sales', new AbortController().signal), /inesperado/);
  const row = { id: 'x', customerId: draft.partnerId, productId: draft.productId, quantity: 2, unitPrice: 10, total: 20, status: 'PENDIENTE' };
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [row, row] }));
  await assert.rejects(transactionsRequest('https://example.test', "test.eyJzdWIiOiJhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJjb21wYW55SWQiOiJjbyIsImJyYW5jaElkIjoiYnIifQ.signature", 'sales', new AbortController().signal), /duplicados/);
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ ...row, total: 99 }] }));
  await assert.rejects(transactionsRequest('https://example.test', "test.eyJzdWIiOiJhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJjb21wYW55SWQiOiJjbyIsImJyYW5jaElkIjoiYnIifQ.signature", 'sales', new AbortController().signal), /inconsistente/);
  globalThis.fetch = async () => new Response('', { status: 401 });
  await assert.rejects(createTransactionRequest('https://example.test', "test.eyJzdWIiOiJhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJjb21wYW55SWQiOiJjbyIsImJyYW5jaElkIjoiYnIifQ.signature", 'sales', draft, new AbortController().signal), (error: any) => error.status === 401 && /sesión expiró/.test(error.message));
});
