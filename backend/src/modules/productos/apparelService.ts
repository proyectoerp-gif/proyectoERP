import mongoose from 'mongoose';
import {AppError} from '../../errors/AppError.js';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {getProductModel} from './models/Product.js';
import type {Apparel} from './apparel.js';

export async function updateApparel(id:string,scope:{companyId:string;branchId:string;userId:string},apparel:Apparel,expected:Apparel|null,ipAddress?:string) {
  const products=getProductModel(),audit=getAuditEventModel();
  await Promise.all([products.init(),audit.init()]);
  const session=await mongoose.startSession();
  try {
    return await session.withTransaction(async()=>{
      const snapshot=expected?Object.fromEntries(Object.entries(expected).map(([key,value])=>['apparel.'+key,value])):{apparel:null};
      const row=await products.findOneAndUpdate({_id:id,companyId:scope.companyId,...snapshot},{$set:{apparel}},{new:true,runValidators:true,session}).lean().exec();
      if(!row)throw new AppError({code:'CONFLICT',statusCode:409,message:'Apparel changed or product unavailable',friendlyMessage:'La ficha cambió o el producto no está disponible. Cierra y actualiza el catálogo antes de editar.'});
      await audit.create([{...scope,module:'productos',action:'UPDATE',entityId:id,details:{operation:'APPAREL_UPDATE',fields:Object.keys(apparel)},ipAddress}],{session});
      return {id:String(row._id),apparel:row.apparel};
    });
  } finally {await session.endSession();}
}
