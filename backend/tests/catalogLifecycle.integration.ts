import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
vi.mock('../src/middleware/authenticate.js',()=>({authenticate:(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401)}));
vi.mock('../src/middleware/tenant.js',()=>({tenant:(req:any,_res:any,next:any)=>{req.tenant={companyId:'co',branchId:'br',userId:'editor'};next();}}));
vi.mock('../src/middleware/authorize.js',()=>({authorize:()=> (req:any,res:any,next:any)=>req.headers.authorization==='Bearer editor'?next():res.sendStatus(403)}));
import {catalogLifecycleRoutes} from '../src/core/catalogLifecycle.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getCustomerModel} from '../src/modules/clientes/models/Customer.js';
import {getSupplierModel} from '../src/modules/proveedores/models/Supplier.js';
import {getBankAccountModel} from '../src/modules/finanzas/models/FinanceModels.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
const database='codex_lifecycle_'+randomUUID().replaceAll('-','');let owned=false,server:Server|undefined,base='';
const configs=[
 {kind:'products',model:getProductModel,branchScoped:false,fields:{categoryId:'category',sku:'SKU',price:10}},
 {kind:'customers',model:getCustomerModel,branchScoped:true,fields:{taxId:'CUSTOMER',email:'customer@example.test'}},
 {kind:'suppliers',model:getSupplierModel,branchScoped:true,fields:{taxId:'SUPPLIER',email:'supplier@example.test'}},
 {kind:'bank-accounts',model:getBankAccountModel,branchScoped:true,fields:{bankName:'Fictional',iban:'LOCAL123456'}}
] as const;
beforeAll(async()=>{
 const uri=process.env.STOCK_TEST_MONGODB_URI;if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw new Error('Explicit localhost replica required');
 await mongoose.connect(uri,{dbName:database});owned=mongoose.connection.db?.databaseName===database;if(!owned)throw new Error('Unexpected database');
 const app=express();app.use(express.json());
 for(const config of configs)app.use('/'+config.kind,catalogLifecycleRoutes({...config,model:config.model as ()=>mongoose.Model<any>,permission:'test.editar',module:config.kind}));
 app.use((e:any,_req:any,res:any,_next:any)=>res.status(e.statusCode??500).json({ok:false,error:e.code??'INTERNAL'}));
 server=app.listen(0);await new Promise<void>(resolve=>server!.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
afterAll(async()=>{await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());if(owned&&mongoose.connection.db?.databaseName===database&&database.startsWith('codex_lifecycle_'))await mongoose.connection.dropDatabase();await mongoose.disconnect();});
describe.each(configs)('$kind reversible removal',config=>{
 let id='a'.repeat(24);const name='Registro '+config.kind;
 const send=(body:unknown,auth='Bearer editor',key=id)=>fetch(base+'/'+config.kind+'/'+key+'/status',{method:'PATCH',headers:{'Content-Type':'application/json',...(auth?{Authorization:auth}:{})},body:JSON.stringify(body)});
 const remove={expectedStatus:'ACTIVE',status:'INACTIVE',expectedName:name};
 it('enforces authentication, permission and strict input before changing a record',async()=>{
  expect((await send(remove,'')).status).toBe(401);expect((await send(remove,'Bearer reader')).status).toBe(403);
  for(const body of [{...remove,companyId:'other'},{...remove,branchId:'other'},{...remove,status:'ACTIVE'},{status:'INACTIVE'},{...remove,status:'DELETED'}])expect((await send(body,'Bearer editor','a'.repeat(24))).status).toBe(400);
 });
 it('archives and restores without deleting identity or historical fields, with one atomic audit',async()=>{
  const model=config.model() as mongoose.Model<any>;const row=await model.create({companyId:'co',branchId:'br',name,...config.fields});id=String(row._id);
  expect((await send(remove)).status).toBe(200);const archived=await model.findById(id).lean();expect(archived).toMatchObject({status:'INACTIVE',name,...config.fields});
  expect((await send(remove)).status).toBe(409);
  expect(await getAuditEventModel().countDocuments({entityId:id,action:'DELETE'})).toBe(1);
  expect((await send({expectedStatus:'INACTIVE',status:'ACTIVE',expectedName:name})).status).toBe(200);expect((await model.findById(id))!.status).toBe('ACTIVE');
 });
 it('rejects a stale name and foreign company or branch',async()=>{
  expect((await send({...remove,expectedName:'Stale'})).status).toBe(409);
  const model=config.model() as mongoose.Model<any>;
  const foreign=await model.create({companyId:'other',branchId:'br',name,...config.fields});
  expect((await send(remove,'Bearer editor',String(foreign._id))).status).toBe(409);expect((await model.findById(foreign._id))!.status).toBe('ACTIVE');
  if(config.branchScoped){const other=await model.create({companyId:'co',branchId:'other',name,...config.fields,...('taxId' in config.fields?{taxId:'OTHER-'+config.kind}:{})});expect((await send(remove,'Bearer editor',String(other._id))).status).toBe(409);}
 });
 it('rolls back the state if its audit cannot be written',async()=>{
  const audit=vi.spyOn(getAuditEventModel(),'create').mockRejectedValueOnce(new Error('Audit unavailable'));
  try{expect((await send(remove)).status).toBe(500);}finally{audit.mockRestore();}
  expect((await (config.model() as mongoose.Model<any>).findById(id))!.status).toBe('ACTIVE');
 });
 it('allows a single transition during concurrent requests',async()=>{
  const responses=await Promise.all([send(remove),send(remove)]);expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
  expect(await getAuditEventModel().countDocuments({entityId:id,action:'DELETE'})).toBe(2);
 });
});
