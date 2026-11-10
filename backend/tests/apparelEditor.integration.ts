import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import express from 'express';
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {createProductRoutes} from '../src/modules/productos/productRoutes.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getUserModel} from '../src/modules/usuarios/models/User.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
import {getDepartmentModel} from '../src/modules/empresas/models/Department.js';
import {getEmployeeModel} from '../src/modules/recursos-humanos/models/Employee.js';
import {getRoleModel} from '../src/modules/roles/models/Role.js';
import {pageEmployees} from '../src/modules/recursos-humanos/employeeService.js';
import {pageUsersForTenantMongo} from '../src/modules/usuarios/userRepositoryMongo.js';
import {signToken} from '../src/security/jwt.js';
import type {Apparel} from '../src/modules/productos/apparel.js';
const database='codex_apparel_'+randomUUID().replaceAll('-',''),companyId='apparel-local',branchId='local-branch';
let server:Server|undefined,base='',owned=false,editor='',reader='',foreign='';
const apparel:Apparel={audience:'Unisex',sizes:['S','M'],color:'Azul',colorHex:'#203060',material:'Algodón de demostración',description:'Camiseta de corte recto de demostración.',garment:'tee'};
beforeAll(async()=>{
  const uri=process.env.STOCK_TEST_MONGODB_URI;
  if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw new Error('Explicit localhost replica required');
  await mongoose.connect(uri,{dbName:database});owned=mongoose.connection.db?.databaseName===database;
  if(!owned)throw new Error('Unexpected database');
  for(const role of ['editor','reader','foreign']){
    const co=role==='foreign'?'other-company':companyId;
    const user=await getUserModel().create({companyId:co,branchId,name:role,email:role+'@example.test',passwordHash:'unused',roleId:'role-admin-demo',permissions:role==='reader'?['productos.ver']:['productos.ver','productos.editar']});
    const token=signToken({sub:String(user._id),companyId:co,branchId,sessionVersion:0});if(role==='editor')editor=token;else if(role==='reader')reader=token;else foreign=token;
  }
  const app=express();app.use(express.json());app.use('/products',createProductRoutes());
  app.use((error:any,_req:any,res:any,_next:any)=>res.status(error.statusCode??500).json({ok:false,error:{code:error.code}}));
  server=app.listen(0);await new Promise<void>(resolve=>server!.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
afterAll(async()=>{vi.restoreAllMocks();await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());if(owned&&mongoose.connection.db?.databaseName===database&&database.startsWith('codex_apparel_'))await mongoose.connection.dropDatabase();await mongoose.disconnect();});
async function product(){return getProductModel().create({companyId,categoryId:String(new mongoose.Types.ObjectId()),name:'Prenda local',sku:randomUUID(),price:125});}
function patch(id:string,token:string,body:unknown){return fetch(base+'/products/'+id+'/apparel',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});}
it('requires editor permissions and the current company, rejecting malformed or duplicate sizes',async()=>{
  const row=await product(),body={apparel,expected:null};
  expect((await patch(String(row._id),'',body)).status).toBe(401);
  expect((await patch(String(row._id),reader,body)).status).toBe(403);
  expect((await patch(String(row._id),foreign,body)).status).toBe(409);
  expect((await patch(String(row._id),editor,{...body,companyId:'other'})).status).toBe(400);
  expect((await patch(String(row._id),editor,{...body,apparel:{...apparel,sizes:['M','M']}})).status).toBe(400);
  expect((await patch(String(row._id),editor,{...body,apparel:{...apparel,sizes:[]}})).status).toBe(400);
  expect((await getProductModel().findById(row._id))?.apparel).toBeUndefined();
});
it('updates descriptives with a snapshot and an atomic audit, preserving SKU, price and category',async()=>{
  const row=await product(),id=String(row._id);
  expect((await patch(id,editor,{apparel,expected:null})).status).toBe(200);
  expect((await patch(id,editor,{apparel:{...apparel,color:'Rojo'},expected:null})).status).toBe(409);
  const response=await patch(id,editor,{apparel:{...apparel,color:'Rojo'},expected:apparel});expect(response.status).toBe(200);
  expect((await response.json()).data.apparel.color).toBe('Rojo');
  const saved=await getProductModel().findById(id);expect(saved?.sku).toBe(row.sku);expect(saved?.price).toBe(row.price);expect(saved?.categoryId).toBe(row.categoryId);
  expect(await getAuditEventModel().countDocuments({entityId:id,'details.operation':'APPAREL_UPDATE'})).toBe(2);
});
it('rolls back apparel when its audit fails',async()=>{
  const row=await product();const spy=vi.spyOn(getAuditEventModel(),'create').mockRejectedValueOnce(new Error('audit failed'));
  try{expect((await patch(String(row._id),editor,{apparel,expected:null})).status).toBe(500);}finally{spy.mockRestore();}
  expect((await getProductModel().findById(row._id))?.apparel).toBeUndefined();
});
it('only attaches directory names within scope and preserves inactive history',async()=>{
  await getDepartmentModel().create([{_id:'local-dept',companyId,branchId,name:'Ventas',code:'V',status:'INACTIVE'},{_id:'foreign-dept',companyId,branchId:'other-branch',name:'Private department',code:'P'}]);
  await getEmployeeModel().create([{companyId,branchId,departmentId:'local-dept',userId:'one',fullName:'Empleado uno',position:'Operador'},{companyId,branchId,departmentId:'foreign-dept',userId:'two',fullName:'Empleado dos',position:'Operador'}]);
  const page=await pageEmployees(companyId,branchId,{limit:20,search:''});
  expect(page.items.find(row=>row.userId==='one')?.departmentName).toBe('Ventas (inactivo)');
  expect(page.items.find(row=>row.userId==='two')?.departmentName).toBeNull();
  const role=await getRoleModel().create({companyId:'other-company',name:'SECRET',description:'Private',permissions:[]});
  await getUserModel().create({companyId,branchId,name:'Local foreign role link',email:'role@example.test',passwordHash:'unused',roleId:String(role._id),permissions:[]});
  const users=await pageUsersForTenantMongo(companyId,branchId,{limit:20,search:''});
  expect(users.items.find(row=>row.name==='editor')?.roleName).toBe('ADMIN');
  expect(users.items.find(row=>row.name==='Local foreign role link')?.roleName).toBeNull();
  expect(JSON.stringify(users)).not.toContain('passwordHash');
});
