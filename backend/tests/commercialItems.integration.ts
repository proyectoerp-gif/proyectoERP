import {previewReport} from '../src/modules/reportes/reportPreview.js';
import {beforeAll,beforeEach,afterAll,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
vi.hoisted(()=>{process.env.JWT_SECRET='local-commercial-items-test-'.repeat(4);});
import {createSaleRoutes} from '../src/modules/ventas/saleRoutes.js';
import {createPurchaseOrderRoutes} from '../src/modules/compras/purchaseOrderRoutes.js';
import {createSettlementRoutes,getSettlementModel,settleCommercial,findCommercialSettlement} from '../src/modules/ventas/commercialSettlement.js';
import {createAuditedSale,createAuditedPurchaseOrder,updateAuditedPurchaseOrderStatus} from '../src/core/commercialCreation.js';
import {getSaleModel} from '../src/modules/ventas/models/Sale.js';
import {getPurchaseOrderModel} from '../src/modules/compras/models/PurchaseOrder.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getCategoryModel} from '../src/modules/productos/models/Category.js';
import {getCustomerModel} from '../src/modules/clientes/models/Customer.js';
import {getSupplierModel} from '../src/modules/proveedores/models/Supplier.js';
import {getWarehouseModel} from '../src/modules/inventario/models/Warehouse.js';
import {getStockMovementModel} from '../src/modules/inventario/models/StockMovement.js';
import {receiveStock,listStock} from '../src/modules/inventario/stockService.js';
import {getBankAccountModel,getCashMovementModel} from '../src/modules/finanzas/models/FinanceModels.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
import {getUserModel} from '../src/modules/usuarios/models/User.js';
import {signToken} from '../src/security/jwt.js';
const database='codex_items_'+randomUUID().replaceAll('-','');let owned=false,server:Server|undefined,base='';
let scope:{companyId:string;branchId:string;userId:string},customerId:string,supplierId:string,productIds:string[],warehouseId:string,accountId:string,token:string,reader:string,foreign:string;
beforeAll(async()=>{
 const uri=process.env.STOCK_TEST_MONGODB_URI;if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw new Error('Explicit localhost replica required');
 await mongoose.connect(uri,{dbName:database});owned=mongoose.connection.db?.databaseName===database;if(!owned)throw new Error('Unexpected database');
 const app=express();app.use(express.json());app.use('/sales',createSaleRoutes());app.use('/purchase-orders',createPurchaseOrderRoutes());app.use('/commercial-settlements',createSettlementRoutes());
 app.use((e:any,_req:any,res:any,_next:any)=>res.status(e.statusCode??500).json({ok:false,error:{code:e.code,message:e.friendlyMessage??'Internal'}}));server=app.listen(0);await new Promise<void>(resolve=>server!.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
afterAll(async()=>{await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());if(owned&&mongoose.connection.db?.databaseName===database&&database.startsWith('codex_items_'))await mongoose.connection.dropDatabase();await mongoose.disconnect();});
beforeEach(async()=>{
 const companyId='company-'+randomUUID(),branchId='branch-'+randomUUID();
 const category=await getCategoryModel().create({companyId,name:'Categoría',code:'CAT'});
 const products=await getProductModel().create([{companyId,categoryId:String(category._id),name:'Artículo A',sku:'A',price:19.99},{companyId,categoryId:String(category._id),name:'Artículo B',sku:'B',price:3.5}]);productIds=products.map(p=>String(p._id));
 customerId=String((await getCustomerModel().create({companyId,branchId,name:'Cliente',taxId:'CLIENT',email:'client@example.test'}))._id);
 supplierId=String((await getSupplierModel().create({companyId,branchId,name:'Proveedor',taxId:'SUPPLIER',email:'supplier@example.test'}))._id);
 warehouseId=String((await getWarehouseModel().create({companyId,branchId,name:'Almacén',code:'WH'}))._id);
 accountId=String((await getBankAccountModel().create({companyId,branchId,name:'Caja ficticia',bankName:'Local',iban:'TEST123456'}))._id);
 const permissions=['ventas.crear','ventas.ver','ventas.editar','compras.crear','compras.ver','compras.editar','finanzas.editar','finanzas.ver','inventario.editar','inventario.ver'];
 const user=await getUserModel().create({companyId,branchId,name:'Editor',email:randomUUID()+'@example.test',passwordHash:'unused',roleId:'local',permissions});scope={companyId,branchId,userId:String(user._id)};token=signToken({sub:scope.userId,companyId,branchId,sessionVersion:0});
 for(const kind of ['reader','foreign']){const co=kind==='foreign'?'foreign-'+companyId:companyId;const u=await getUserModel().create({companyId:co,branchId,name:kind,email:randomUUID()+'@example.test',passwordHash:'unused',roleId:'local',permissions:kind==='reader'?['ventas.ver']:permissions});const value=signToken({sub:String(u._id),companyId:co,branchId,sessionVersion:0});if(kind==='reader')reader=value;else foreign=value;}
});
const saleBody=()=>({customerId,items:productIds.map((productId,index)=>({productId,quantity:index===0?1.25:2}))});
const purchaseBody=()=>({supplierId,items:productIds.map((productId,index)=>({productId,quantity:index+1,unitCost:index===0?10.01:2.35}))});
const request=(path:string,body:unknown,auth=token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(body)});
const settleInput=(sourceId:string,kind:'sales'|'purchase-orders'='sales')=>({kind,sourceId,warehouseId,accountId,date:'2026-10-18'});
const seedStock=async()=>{for(const productId of productIds)await receiveStock({...scope,warehouseId,productId,quantity:10,reference:'SEED-'+productId});};
describe('documents with multiple products',()=>{
 it('requires real authentication and permissions for multi-product endpoints',async()=>{for(const [path,body] of [['/sales',saleBody()],['/purchase-orders',purchaseBody()]] as const){expect((await request(path,body,'')).status).toBe(401);expect((await request(path,body,reader)).status).toBe(403);}expect(await getSaleModel().countDocuments({companyId:scope.companyId,branchId:scope.branchId})).toBe(0);});
 it('rejects injected prices, totals, mixed legacy fields, duplicates, oversized carts and invalid quantities',async()=>{
  const body=saleBody();for(const candidate of [{...body,total:1},{...body,productId:productIds[0],quantity:1},{...body,items:[{...body.items[0],unitPrice:0}]},{...body,items:[]},{...body,items:Array.from({length:21},()=>body.items[0])},{...body,items:[body.items[0],body.items[0]]},{...body,items:[{...body.items[0],quantity:0}]},{...body,items:[{...body.items[0],quantity:1.0000001}]}])expect((await request('/sales',candidate)).status).toBe(400);
  expect((await request('/purchase-orders',{...purchaseBody(),items:[{productId:productIds[0],quantity:1,unitCost:1.234}]})).status).toBe(400);
  expect(await getSaleModel().countDocuments({companyId:scope.companyId})).toBe(0);
 });
 it('enforces company, branch and active product scope for every item',async()=>{
  expect((await request('/sales',saleBody(),foreign)).status).toBe(400);
  const other=await getProductModel().create({companyId:'foreign',categoryId:'foreign',name:'Privado',sku:'X',price:99});
  expect((await request('/sales',{...saleBody(),items:[saleBody().items[0],{productId:String(other._id),quantity:1}]})).status).toBe(400);
  await getCustomerModel().updateOne({_id:customerId},{$set:{branchId:'other'}});expect((await request('/sales',saleBody())).status).toBe(400);
  await getProductModel().updateOne({_id:productIds[1]},{$set:{status:'INACTIVE'}});expect((await request('/purchase-orders',purchaseBody())).status).toBe(400);
 });
 it('uses catalog prices, rounds each subtotal and preserves names/prices after catalog edits',async()=>{
  const response=await request('/sales',saleBody());expect(response.status).toBe(201);const {data}=await response.json();expect(data.total).toBe(31.99);expect(data.items.map((i:any)=>i.total)).toEqual([24.99,7]);expect(data.items.map((i:any)=>i.productName)).toEqual(['Artículo A','Artículo B']);
  await getProductModel().updateOne({_id:productIds[0]},{$set:{name:'Nombre nuevo',price:100}});const page=await(await fetch(base+'/sales/page',{headers:{Authorization:'Bearer '+token}})).json();expect(page.data.items[0].items).toEqual(data.items);expect(await getCashMovementModel().countDocuments({companyId:scope.companyId})).toBe(0);
 });
 it('settles all sales items once with one cash movement and a receipt for each stock movement',async()=>{
  await seedStock();const sale=await createAuditedSale({...scope,...saleBody()},{userId:scope.userId});const input=settleInput(sale.id);
  const receipts=await Promise.all([settleCommercial(scope,input),settleCommercial(scope,input)]);expect(receipts[0].id).toBe(receipts[1].id);expect(receipts[0].items).toHaveLength(2);expect(new Set(receipts[0].items!.map((i:any)=>i.stockMovementId)).size).toBe(2);
  expect(await getCashMovementModel().countDocuments({companyId:scope.companyId})).toBe(1);expect((await getCashMovementModel().findOne({companyId:scope.companyId}))!.amount).toBe(31.99);
  const balances=await listStock(scope.companyId,scope.branchId);expect(balances.find(b=>b.productId===productIds[0])!.quantity).toBe(8.75);expect(balances.find(b=>b.productId===productIds[1])!.quantity).toBe(8);
  const receipt=await findCommercialSettlement(scope,{kind:'sales',sourceId:sale.id});expect(receipt.items).toEqual(receipts[0].items);
  await expect(settleCommercial(scope,{...input,date:'2026-10-19'})).rejects.toMatchObject({statusCode:409});
 });
 it('rolls back all stock, cash, receipt and status if the second product lacks stock',async()=>{
  await seedStock();const sale=await createAuditedSale({...scope,customerId,items:[{productId:productIds[0],quantity:1},{productId:productIds[1],quantity:999}]},{userId:scope.userId});
  await expect(settleCommercial(scope,settleInput(sale.id))).rejects.toMatchObject({statusCode:409});
  expect((await getSaleModel().findById(sale.id))!.status).toBe('PENDIENTE');expect(await getCashMovementModel().countDocuments({companyId:scope.companyId})).toBe(0);expect(await getSettlementModel().countDocuments({companyId:scope.companyId})).toBe(0);expect(await getStockMovementModel().countDocuments({companyId:scope.companyId})).toBe(2);expect((await listStock(scope.companyId,scope.branchId)).map(b=>b.quantity)).toEqual([10,10]);
 });
 it('prevents overselling across concurrent documents with reversed item order',async()=>{
  await seedStock();const items=productIds.map(productId=>({productId,quantity:8}));
  const first=await createAuditedSale({...scope,customerId,items},{userId:scope.userId}),second=await createAuditedSale({...scope,customerId,items:[...items].reverse()},{userId:scope.userId});
  const results=await Promise.allSettled([settleCommercial(scope,settleInput(first.id)),settleCommercial(scope,settleInput(second.id))]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  expect((await listStock(scope.companyId,scope.branchId)).map(b=>b.quantity)).toEqual([2,2]);expect(await getCashMovementModel().countDocuments({companyId:scope.companyId})).toBe(1);expect(await getStockMovementModel().countDocuments({companyId:scope.companyId})).toBe(4);
 });
 it('rejects overflow in the aggregate even when both line amounts are valid',async()=>{
  await getProductModel().updateMany({companyId:scope.companyId},{$set:{price:50000000000000}});
  expect((await request('/sales',{customerId,items:productIds.map(productId=>({productId,quantity:1}))})).status).toBe(400);expect(await getSaleModel().countDocuments({companyId:scope.companyId})).toBe(0);
 });
 it('rejects a catalog price whose displayed two-decimal price would misrepresent the subtotal',async()=>{
  await getProductModel().updateOne({_id:productIds[0]},{$set:{price:1.234}});expect((await request('/sales',saleBody())).status).toBe(400);
 });
 it('rolls back all writes if audit fails during multi-product settlement',async()=>{
  await seedStock();const sale=await createAuditedSale({...scope,...saleBody()},{userId:scope.userId});const spy=vi.spyOn(getAuditEventModel(),'create').mockRejectedValueOnce(new Error('audit unavailable'));
  try{await expect(settleCommercial(scope,settleInput(sale.id))).rejects.toThrow('audit unavailable');}finally{spy.mockRestore();}
  expect((await getSaleModel().findById(sale.id))!.status).toBe('PENDIENTE');expect(await getStockMovementModel().countDocuments({companyId:scope.companyId})).toBe(2);expect(await getCashMovementModel().countDocuments({companyId:scope.companyId})).toBe(0);
 });
 it('approves and receives a purchase with each supplied cost and a single payment',async()=>{
  const purchase=await createAuditedPurchaseOrder({...scope,...purchaseBody()},{userId:scope.userId});expect(purchase.total).toBe(14.71);
  await expect(settleCommercial(scope,settleInput(purchase.id,'purchase-orders'))).rejects.toMatchObject({statusCode:409});
  const approved=await updateAuditedPurchaseOrderStatus(purchase.id,scope.companyId,scope.branchId,'PENDIENTE','APROBADA',{userId:scope.userId});expect(approved.items).toHaveLength(2);
  const receipt=await settleCommercial(scope,settleInput(purchase.id,'purchase-orders'));expect(receipt.total).toBe(14.71);expect(receipt.items!.map((i:any)=>i.quantity)).toEqual([1,2]);expect((await getCashMovementModel().findOne({companyId:scope.companyId}))!.type).toBe('OUTFLOW');expect((await getPurchaseOrderModel().findById(purchase.id))!.status).toBe('RECIBIDA');
 });
 it('counts every item in sales reports while preserving legacy quantities',async()=>{
  await createAuditedSale({...scope,...saleBody()},{userId:scope.userId});await createAuditedSale({...scope,customerId,productId:productIds[0],quantity:2},{userId:scope.userId});
  const report=await previewReport(scope.companyId,scope.branchId,'sales','year');expect(report.metrics.orders).toBe(2);expect(report.metrics.units).toBe(5.25);expect(report.metrics.total).toBeCloseTo(71.97,2);
 });
 it('preserves legacy single-product documents and receipt shape',async()=>{
  await seedStock();const legacy=await createAuditedSale({...scope,customerId,productId:productIds[0],quantity:1},{userId:scope.userId});expect(legacy.items).toBeUndefined();const receipt=await settleCommercial(scope,settleInput(legacy.id));expect(receipt.items).toBeUndefined();expect(receipt.quantity).toBe(1);expect(receipt.total).toBe(19.99);
 });
});
