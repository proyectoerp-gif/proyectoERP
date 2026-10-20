import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cartPayload,reviewCart,createMultiTransactionRequest,type CartLine} from '../src/multiTransactionApi';
import {parseTransaction,updateTransactionStatusRequest,type Transaction} from '../src/transactionApi';
import {settlementRequest,receiptRequest} from '../src/settlementApi';
const partner={id:'a'.repeat(24),name:'Cliente',status:'ACTIVE' as const};
const lines:CartLine[]=[{product:{id:'b'.repeat(24),name:'Silla',sku:'SILLA',price:19.99,status:'ACTIVE'},quantity:'1.25',unitCost:'10.01'},{product:{id:'c'.repeat(24),name:'Mesa',sku:'MESA',price:3.5,status:'ACTIVE'},quantity:'2',unitCost:'2.35'}];
const data=(status='PENDIENTE')=>({id:'d'.repeat(24),customerId:partner.id,productId:lines[0].product.id,quantity:1.25,unitPrice:19.99,total:31.99,status,items:lines.map((line,index)=>({productId:line.product.id,productName:line.product.name,sku:line.product.sku,quantity:Number(line.quantity),unitPrice:line.product.price!,total:index===0?24.99:7}))});
test('cart sums rounded subtotals and sends all items without caller prices for sales',()=>{
 assert.equal(reviewCart('sales',partner,lines).total,31.99);
 assert.deepEqual(cartPayload('sales',partner.id,lines),{customerId:partner.id,items:[{productId:lines[0].product.id,quantity:1.25},{productId:lines[1].product.id,quantity:2}]});
 const review=reviewCart('purchase-orders',partner,lines);assert.equal(review.total,17.21);
 assert.deepEqual(cartPayload('purchase-orders',partner.id,lines).items.map(i=>i.unitCost),[10.01,2.35]);
});
test('cart rejects duplicates, inactive references, empty and oversized lists and invalid quantities/costs',()=>{
 for(const invalid of [[],[lines[0],lines[0]],Array.from({length:21},()=>lines[0]),[{...lines[0],quantity:'0'}],[{...lines[0],quantity:'1.0000001'}],[{...lines[0],product:{...lines[0].product,status:'INACTIVE' as const}}]])assert.equal(reviewCart('sales',partner,invalid).ready,false);
 assert.equal(reviewCart('sales',null,lines).ready,false);assert.equal(reviewCart('sales',{...partner,status:'INACTIVE'},lines).ready,false);
 assert.equal(reviewCart('purchase-orders',partner,[{...lines[0],unitCost:'1.234'}]).ready,false);
 assert.equal(reviewCart('sales',partner,[{...lines[0],product:{...lines[0].product,price:1.234}}]).ready,false);
});
test('multi-product parser checks every subtotal, identity, aggregate and legacy compatibility',()=>{
 assert.equal(parseTransaction(data(),'sales').items?.length,2);
 for(const value of [{...data(),total:32},{...data(),items:[]},{...data(),items:[data().items[0],data().items[0]]},{...data(),items:[{...data().items[0],total:0},data().items[1]]},{...data(),productId:'e'.repeat(24)}])assert.throws(()=>parseTransaction(value,'sales'));
 const {items,...legacy}=data();assert.equal(parseTransaction({...legacy,total:24.99},'sales').items,undefined);
});
test('creation confirms all submitted lines and keeps ambiguous responses explicit',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const signal=new AbortController().signal;
 globalThis.fetch=async(_url,options)=>{assert.deepEqual(JSON.parse(String(options?.body)),cartPayload('sales',partner.id,lines));return new Response(JSON.stringify({data:data()}));};
 assert.equal((await createMultiTransactionRequest('/api','token','sales',partner.id,lines,signal)).total,31.99);
 globalThis.fetch=async()=>new Response(JSON.stringify({data:{...data(),items:[data().items[0]],total:24.99}}));
 await assert.rejects(()=>createMultiTransactionRequest('/api','token','sales',partner.id,lines,signal),/podría haberse registrado/);
});
test('status update rejects a changed line even when total and first product still match',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const current=parseTransaction(data(),'sales');
 globalThis.fetch=async()=>new Response(JSON.stringify({data:{...data('CANCELADA'),items:[data().items[0],{...data().items[1],productName:'Unexpected'}]}}));
 await assert.rejects(()=>updateTransactionStatusRequest('/api','token','sales',current,'CANCELADA',new AbortController().signal));
});
test('receipts verify every item and stock movement and use aggregate quantity only for compatibility',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const row=parseTransaction(data(),'sales'),scope={companyId:'co',branchId:'br'},input={warehouseId:'e'.repeat(24),accountId:'f'.repeat(24),date:'2026-10-18'};
 const receipt={id:'1'.repeat(24),...scope,...input,kind:'sales',sourceId:row.id,stockMovementId:'2'.repeat(24),cashMovementId:'3'.repeat(24),quantity:3.25,total:31.99,status:'PAGADA',items:row.items!.map((item,index)=>({...item,stockMovementId:(index===0?'2':'4').repeat(24)}))};
 globalThis.fetch=async()=>new Response(JSON.stringify({data:receipt}));const signal=new AbortController().signal;
 assert.equal(await settlementRequest('/api','token','sales',row,input,scope,signal),receipt.id);assert.equal((await receiptRequest('/api','token','sales',row,scope,signal)).items?.length,2);
 for(const invalid of [{...receipt,items:receipt.items.slice(0,1)},{...receipt,items:receipt.items.map(i=>({...i,stockMovementId:'2'.repeat(24)}))},{...receipt,quantity:row.quantity}]){globalThis.fetch=async()=>new Response(JSON.stringify({data:invalid}));await assert.rejects(()=>receiptRequest('/api','token','sales',row,scope,signal));}
});
