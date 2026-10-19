import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseActivity,postActivity,type Activity} from '../src/commercialActivityApi';
import {confirmLeaveWorkspace,confirmationBroker} from '../src/interaction';
import type {Transaction} from '../src/transactionApi';
const row:Transaction={id:'a'.repeat(24),partnerId:'b'.repeat(24),productId:'c'.repeat(24),quantity:2,unitPrice:10,total:20,status:'PENDIENTE'};
const state=():Activity=>({kind:'sales',sourceId:row.id,version:1,total:20,returnedValue:0,netTotal:20,paid:5,refunded:0,netPaid:5,outstanding:15,refundable:0,dueDate:null,canceled:false,unknownLegacy:false,legacyReceiptId:null,items:[{productId:row.productId,productName:'Artículo',sku:'DEMO',quantity:2,unitPrice:10,total:20,delivered:1,returned:0}],events:[{requestId:'00000000-0000-4000-8000-000000000001',action:'PAYMENT',date:'2026-10-18',note:'Anticipo local',amount:5,accountId:'d'.repeat(24),cashMovementId:'e'.repeat(24),userId:'staff',createdAt:'2026-10-18T12:00:00Z'}]});
test('activity verifies document identity, balances, version and item progress',()=>{
 assert.equal(parseActivity(state(),'sales',row).outstanding,15);
 for(const value of [{...state(),outstanding:20},{...state(),sourceId:'f'.repeat(24)},{...state(),version:2},{...state(),items:[{...state().items[0],returned:2}]},{...state(),paid:25,netPaid:25,outstanding:0,refundable:5}])assert.throws(()=>parseActivity(value,'sales',row));
});
test('writes confirm the exact payment request rather than accepting an unrelated event',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const event=state().events[0],payload={requestId:event.requestId,expectedVersion:0,action:'PAYMENT' as const,date:event.date,note:event.note,accountId:event.accountId,amount:5};
 globalThis.fetch=async(_url,options)=>{assert.equal(JSON.parse(String(options?.body)).amount,5);return new Response(JSON.stringify({data:state()}));};
 await postActivity('/api','token','sales',row,payload,new AbortController().signal);
 globalThis.fetch=async()=>new Response(JSON.stringify({data:{...state(),events:[{...event,amount:4}]}}));await assert.rejects(()=>postActivity('/api','token','sales',row,payload,new AbortController().signal));
});
test('leaving a dirty form requires confirmation and cancellation preserves the workspace',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'document');let prompt:any;
 Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:(selector:string)=>selector.includes('data-form-dirty')?{}:null}});
 const detach=confirmationBroker.attach(value=>{prompt=value;});try{const result=confirmLeaveWorkspace();assert.match(prompt.title,/cambios sin guardar/);confirmationBroker.settle(prompt.id,false);assert.equal(await result,false);}finally{detach();if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');}
});
