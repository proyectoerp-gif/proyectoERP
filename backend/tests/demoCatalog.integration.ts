import {beforeAll,afterAll,it,expect} from 'vitest';
import mongoose from 'mongoose';
import {populateDemoCatalog,assertDemoCatalogTarget} from '../src/scripts/demoCatalog.js';
import {demoScope} from '../src/modules/demoSupport/knowledge.js';
import {getCompanyModel} from '../src/modules/empresas/models/Company.js';
import {getBranchModel} from '../src/modules/empresas/models/Branch.js';
import {getCategoryModel} from '../src/modules/productos/models/Category.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
let owned=false;
beforeAll(async()=>{
 const uri=process.env.STOCK_TEST_MONGODB_URI;
 if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw new Error('Explicit isolated localhost replica set required');
 await mongoose.connect(uri,{dbName:'erp_app'});owned=true;
 await getCompanyModel().create({_id:demoScope.companyId,name:'Empresa ficticia anterior',taxId:'DEMO-OLD',status:'ACTIVE'});
 await getBranchModel().create({_id:demoScope.branchId,companyId:demoScope.companyId,name:'Pruebas',code:'DEMO-01',city:'Ciudad de México',isActive:true});
});
afterAll(async()=>{if(owned&&mongoose.connection.db?.databaseName==='erp_app')await mongoose.connection.dropDatabase();await mongoose.disconnect();});
it('refuses production and every database other than erp_app',()=>{
 expect(()=>assertDemoCatalogTarget('production','erp_production')).toThrow();expect(()=>assertDemoCatalogTarget('demo','erp_production')).toThrow();expect(()=>assertDemoCatalogTarget('demo','other')).toThrow();
});
it('adds four categories and twelve products once, preserves manual changes and foreign tenants',async()=>{
 await getProductModel().create({companyId:'foreign',categoryId:'foreign-category',sku:'ALB-SIL-001',name:'Producto privado',price:123});
 const first=await populateDemoCatalog('test');expect(first).toMatchObject({renamed:true,categoriesCreated:4,productsCreated:12});
 const initial=await getProductModel().findOne({companyId:demoScope.companyId,sku:'ALB-SIL-001'}).lean();
 await getProductModel().updateOne({_id:initial!._id},{$set:{price:999}});const edited=await getProductModel().findById(initial!._id).lean();
 expect(await populateDemoCatalog('test')).toMatchObject({renamed:false,categoriesCreated:0,productsCreated:0});
 const unchanged=await getProductModel().findById(initial!._id).lean();expect(unchanged!.price).toBe(999);expect(unchanged!.updatedAt).toEqual(edited!.updatedAt);
 expect(await getProductModel().countDocuments({companyId:demoScope.companyId})).toBe(12);expect(await getCategoryModel().countDocuments({companyId:demoScope.companyId})).toBe(4);
 expect(await getProductModel().findOne({companyId:'foreign'}).lean()).toMatchObject({name:'Producto privado',price:123});
 expect(await getAuditEventModel().countDocuments({companyId:demoScope.companyId})).toBe(1);
});
it('rolls back branding and partial inserts if an existing category was retired',async()=>{
 await getProductModel().deleteMany({companyId:demoScope.companyId});
 await getCompanyModel().updateOne({_id:demoScope.companyId},{$set:{name:'Nombre que debe conservarse'}});
 await getCategoryModel().updateOne({companyId:demoScope.companyId,code:'ALB-PAP'},{$set:{status:'INACTIVE'}});
 await expect(populateDemoCatalog('test')).rejects.toThrow(/retirada/);
 expect(await getProductModel().countDocuments({companyId:demoScope.companyId})).toBe(0);
 expect((await getCompanyModel().findById(demoScope.companyId).lean())!.name).toBe('Nombre que debe conservarse');
});
