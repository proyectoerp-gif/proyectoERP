import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmationBroker,canLeaveWorkspace,listenForNotices,type Confirmation} from '../src/interaction';
import {reviewTransaction,localDate} from '../src/operationReview';
import {requestData} from '../src/webApi';

test('confirmation fails closed without a mounted interface and blocks a second simultaneous request',async()=>{
 const broker=createConfirmationBroker();assert.equal(await broker.request('No host'),false);
 let shown:Confirmation|null=null;const dispose=broker.attach(value=>{shown=value;});
 const first=broker.request('Guardar venta',{confirmLabel:'Crear venta'});assert.equal(await broker.request('Duplicado'),false);
 assert.equal(shown!.confirmLabel,'Crear venta');broker.settle(shown!.id,true);assert.equal(await first,true);dispose();
});
test('Escape/cancellation and unmount never approve a pending action; stale answers cannot approve another request',async()=>{
 const broker=createConfirmationBroker();let shown:Confirmation|null=null;const dispose=broker.attach(value=>{shown=value;});
 const first=broker.request('Uno'),oldId=shown!.id;broker.settle(oldId,false);assert.equal(await first,false);
 const next=broker.request('Dos'),nextId=shown!.id;broker.settle(oldId,true);assert.equal(shown!.id,nextId);
 dispose();assert.equal(await next,false);assert.equal(await broker.request('Tres'),false);
});
test('workspace navigation is blocked only while a write boundary is pending, with clear feedback',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document');let pending=false,message='';
 Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:(selector:string)=>{assert.equal(selector,'[data-operation-pending="true"]');return pending?{}:null;}}});
 const dispose=listenForNotices(notice=>{message=notice.message;});
 try{assert.equal(canLeaveWorkspace(),true);pending=true;assert.equal(canLeaveWorkspace(),false);assert.match(message,/termine el guardado/);pending=false;assert.equal(canLeaveWorkspace(),true);}
 finally{dispose();if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else Reflect.deleteProperty(globalThis,'document');}
});
const partner={id:'111111111111111111111111',name:'Cliente',status:'ACTIVE' as const};
const product={id:'222222222222222222222222',name:'Producto',status:'ACTIVE' as const,price:1299.5};
const draft={partnerId:partner.id,productId:product.id,quantity:'3',unitCost:''};
test('commercial review validates actual selections and rounds like the server without inventing a price',()=>{
 assert.deepEqual(reviewTransaction('sales',draft,partner,product),{ready:true,quantity:3,unitPrice:1299.5,total:3898.5,message:''});
 assert.equal(reviewTransaction('sales',{...draft,quantity:'0'},partner,product).ready,false);
 assert.equal(reviewTransaction('sales',draft,partner,{...product,status:'INACTIVE'}).ready,false);
 assert.equal(reviewTransaction('sales',draft,partner,{...product,price:undefined}).ready,false);
 assert.equal(reviewTransaction('purchase-orders',draft,partner,product).ready,false);
 assert.equal(reviewTransaction('purchase-orders',{...draft,unitCost:'12.30'},partner,product).ready,true);
 assert.equal(reviewTransaction('sales',draft,partner,{...product,price:1e30}).ready,false);
});
test('cash date follows the local calendar rather than a UTC date conversion',()=>{
 const date=new Date(2026,9,16,23,50);assert.equal(localDate(date),'2026-10-16');
});
test('public business errors explain rejected writes while internal or malformed errors stay generic',async()=>{
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json({ok:false,error:{code:'CONFLICT',message:'No hay existencias suficientes en este almacén.'}},{status:409});
  await assert.rejects(requestData('https://example.test','/commercial-settlements'),/existencias suficientes/);
  for(const body of [{ok:false,error:{code:'INTERNAL',message:'PRIVATE STACK'}},{ok:false,error:{code:'CONFLICT',message:'PRIVATE\nSTACK'}}]){
   globalThis.fetch=async()=>Response.json(body,{status:409});await assert.rejects(requestData('https://example.test','/write'),(error:Error)=>!error.message.includes('PRIVATE'));
  }
 }finally{globalThis.fetch=previous;}
});
