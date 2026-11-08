import {createHash} from 'node:crypto';
import mongoose,{type ClientSession} from 'mongoose';
import {AppError} from '../../errors/AppError.js';
import {getProductModel} from '../productos/models/Product.js';
import {getCategoryModel} from '../productos/models/Category.js';
import {getCompanyModel} from '../empresas/models/Company.js';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {fashionCategories,fashionProducts} from '../../scripts/fashionCatalogData.js';
import {demoScope} from './knowledge.js';

const operation='ALBOR_FASHION_CATALOG_V1';
type Scope={companyId:string;branchId:string;userId:string};
function assertTarget(scope:Scope,environment:string){
  if(environment!=='demo'||mongoose.connection.db?.databaseName!=='erp_app'||scope.companyId!==demoScope.companyId||scope.branchId!==demoScope.branchId)throw new AppError({code:'NOT_FOUND',statusCode:404,message:'Demo setup unavailable',friendlyMessage:'Esta operación solo está disponible en la empresa demo.'});
}
async function snapshot(session?:ClientSession){
  const products=await
    getProductModel().find({companyId:demoScope.companyId,status:'ACTIVE'}).select('_id updatedAt').sort({_id:1}).limit(501).session(session??null).lean();
  const categories=await getCategoryModel().find({companyId:demoScope.companyId,status:'ACTIVE'}).select('_id updatedAt').sort({_id:1}).limit(501).session(session??null).lean();
  if(products.length>500||categories.length>500)throw new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Demo catalog too large',friendlyMessage:'El catálogo supera el límite de esta preparación de ejemplo.'});
  return {products,categories,fingerprint:createHash('sha256').update(JSON.stringify({products,categories})).digest('hex')};
}
function completed(session?:ClientSession){
  return getAuditEventModel().findOne({companyId:demoScope.companyId,module:'productos','details.operation':operation}).session(session??null).lean();
}
export async function previewFashionSetup(scope:Scope,environment:string){
  assertTarget(scope,environment);
  if(await completed())return {completed:true,fingerprint:null,activeProducts:0,activeCategories:0,newProducts:fashionProducts.length};
  const source=await snapshot();
  return {completed:false,fingerprint:source.fingerprint,activeProducts:source.products.length,activeCategories:source.categories.length,newProducts:fashionProducts.length};
}
export async function applyFashionSetup(scope:Scope,environment:string,expected:string){
  assertTarget(scope,environment);
  await Promise.all([getProductModel().init(),getCategoryModel().init(),getAuditEventModel().init()]);
  const session=await mongoose.startSession();
  try{
    return await session.withTransaction(async()=>{
      if(await completed(session))return {completed:true,newProducts:fashionProducts.length};
      const source=await snapshot(session);
      if(source.fingerprint!==expected)throw new AppError({code:'CONFLICT',statusCode:409,message:'Demo catalog changed',friendlyMessage:'El catálogo cambió. Actualiza la vista previa antes de continuar.'});
      if(await getProductModel().exists({companyId:scope.companyId,sku:{$in:fashionProducts.map(row=>row.sku)}}).session(session))throw new AppError({code:'CONFLICT',statusCode:409,message:'Fashion SKU already exists',friendlyMessage:'Ya existe un código reservado para la colección de moda. Revisa el catálogo antes de continuar.'});
      const company=await getCompanyModel().findOneAndUpdate({_id:scope.companyId,status:'ACTIVE'},{$set:{name:'Albor Moda — empresa ficticia',taxId:'DEMO-ALBOR'}},{session,new:true});
      if(!company)throw new AppError({code:'NOT_FOUND',statusCode:404,message:'Demo company unavailable',friendlyMessage:'No se encontró la empresa demo activa.'});
      await getProductModel().updateMany({companyId:scope.companyId,_id:{$in:source.products.map(row=>row._id)}},{$set:{status:'INACTIVE'}},{session});
      await getCategoryModel().updateMany({companyId:scope.companyId,_id:{$in:source.categories.map(row=>row._id)}},{$set:{status:'INACTIVE'}},{session});
      const categoryIds=new Map<string,string>();
      for(const category of fashionCategories){
        const row=await getCategoryModel().findOneAndUpdate({companyId:scope.companyId,code:category.code},{$set:{name:category.name,status:'ACTIVE'}},{upsert:true,new:true,session,runValidators:true});
        categoryIds.set(category.code,String(row._id));
      }
      for(const product of fashionProducts){
        const {category,...data}=product;
        await getProductModel().updateOne({companyId:scope.companyId,sku:product.sku},{$setOnInsert:{...data,categoryId:categoryIds.get(category),companyId:scope.companyId,status:'ACTIVE'}},{upsert:true,session,runValidators:true});
      }
      await getAuditEventModel().create([{...scope,action:'UPDATE',module:'productos',entityId:scope.companyId,details:{
        operation,retiredProductIds:source.products.map(row=>String(row._id)),retiredCategoryIds:source.categories.map(row=>String(row._id)),newProducts:fashionProducts.length,
      }}],{session});
      return {completed:true,newProducts:fashionProducts.length};
    });
  }finally{await session.endSession();}
}
