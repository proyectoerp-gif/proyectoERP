import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import mongoose from 'mongoose';
import {applyFashionSetup,previewFashionSetup} from '../src/modules/demoSupport/fashionSetup.js';
import {publicDemoCatalog} from '../src/modules/demoSupport/catalog.js';
import {demoScope} from '../src/modules/demoSupport/knowledge.js';
import {getCompanyModel} from '../src/modules/empresas/models/Company.js';
import {getCategoryModel} from '../src/modules/productos/models/Category.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
const scope={...demoScope,userId:'fashion-admin'};
let owned=false,oldId='',fingerprint='';
beforeAll(async()=>{
 const uri=process.env.STOCK_TEST_MONGODB_URI;
 if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw new Error('Explicit isolated localhost replica required');
 await mongoose.connect(uri,{dbName:'erp_app'});owned=true;
 await getCompanyModel().create({_id:scope.companyId,name:'Empresa anterior',taxId:'DEMO-OLD'});
 const category=await getCategoryModel().create({companyId:scope.companyId,name:'Oficina',code:'OLD'});
 oldId=String((await getProductModel().create({companyId:scope.companyId,categoryId:String(category._id),sku:'OLD',name:'Producto anterior',price:123,imageData:'preserved-photo'}))._id);
 await getProductModel().create({companyId:'foreign',categoryId:'foreign-category',sku:'OLD',name:'Privado',price:456});
});
afterAll(async()=>{if(owned&&mongoose.connection.db?.databaseName==='erp_app')await mongoose.connection.dropDatabase();await mongoose.disconnect();});
it('refuses production and foreign company or branch',async()=>{
 for(const [target,environment] of [[scope,'production'],[{...scope,companyId:'foreign'},'demo'],[{...scope,branchId:'foreign'},'demo']] as const)await expect(previewFashionSetup(target,environment)).rejects.toThrow();
 expect(await getProductModel().countDocuments()).toBe(2);
});
it('rejects stale previews and rolls back every write when audit fails',async()=>{
 fingerprint=(await previewFashionSetup(scope,'demo')).fingerprint!;
 await getProductModel().updateOne({_id:oldId},{$set:{price:125}});
 await expect(applyFashionSetup(scope,'demo',fingerprint)).rejects.toThrow(/changed/);
 fingerprint=(await previewFashionSetup(scope,'demo')).fingerprint!;
 const audit=vi.spyOn(getAuditEventModel(),'create').mockRejectedValueOnce(new Error('audit unavailable'));
 await expect(applyFashionSetup(scope,'demo',fingerprint)).rejects.toThrow('audit unavailable');audit.mockRestore();
 expect((await getProductModel().findById(oldId).lean())!.status).toBe('ACTIVE');
 expect((await getCompanyModel().findById(scope.companyId).lean())!.name).toBe('Empresa anterior');
 expect(await getProductModel().countDocuments()).toBe(2);
});
it('creates 20 fashion products once and preserves retired records and foreign tenants',async()=>{
 fingerprint=(await previewFashionSetup(scope,'demo')).fingerprint!;
 await applyFashionSetup(scope,'demo',fingerprint);
 expect(await getProductModel().countDocuments({companyId:scope.companyId,status:'ACTIVE'})).toBe(20);
 expect(await getCategoryModel().countDocuments({companyId:scope.companyId,status:'ACTIVE'})).toBe(6);
 expect(await getProductModel().findById(oldId).select('+imageData').lean()).toMatchObject({status:'INACTIVE',price:125,imageData:'preserved-photo'});
 expect(await getProductModel().findOne({companyId:'foreign'}).lean()).toMatchObject({status:'ACTIVE',price:456});
 expect(await getAuditEventModel().findOne({companyId:scope.companyId}).lean()).toMatchObject({details:{retiredProductIds:[oldId],newProducts:20}});
 await applyFashionSetup(scope,'demo',fingerprint);
 expect(await getProductModel().countDocuments({companyId:scope.companyId})).toBe(21);
 expect((await previewFashionSetup(scope,'demo')).completed).toBe(true);
});
it('filters public fashion metadata and favorite IDs without exposing other tenants',async()=>{
 const page=await publicDemoCatalog({audience:'Mujer',size:'M',color:'Negro'});
 expect(page.items.length).toBeGreaterThan(0);
 for(const row of page.items)expect(row.apparel).toMatchObject({audience:'Mujer',color:'Negro',sizes:expect.arrayContaining(['M'])});
 const foreign=await getProductModel().findOne({companyId:'foreign'}).lean();
 expect((await publicDemoCatalog({ids:String(foreign!._id)+','+oldId})).items).toHaveLength(0);
 expect((await publicDemoCatalog({ids:page.items[0].id})).items).toHaveLength(1);
});
it('paginates price order globally and rejects mismatched or invalid cursors',async()=>{
 for(const sort of ['price-asc','price-desc']){
  const first=await publicDemoCatalog({sort});const second=await publicDemoCatalog({sort,cursor:first.nextCursor});
  const rows=[...first.items,...second.items];expect(rows).toHaveLength(20);expect(new Set(rows.map(row=>row.id)).size).toBe(20);
  expect(rows.map(row=>row.price)).toEqual(rows.map(row=>row.price).sort((a,b)=>sort==='price-asc'?a-b:b-a));
  await expect(publicDemoCatalog({sort:sort==='price-asc'?'price-desc':'price-asc',cursor:first.nextCursor})).rejects.toThrow();
 }
 await expect(publicDemoCatalog({cursor:'bad'})).rejects.toThrow();
});
