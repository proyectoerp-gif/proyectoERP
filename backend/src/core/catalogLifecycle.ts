import mongoose, {type Model} from 'mongoose';
import {Router} from 'express';
import {z} from 'zod';
import {authenticate} from '../middleware/authenticate.js';
import {tenant} from '../middleware/tenant.js';
import {authorize} from '../middleware/authorize.js';
import {AppError} from '../errors/AppError.js';
import {getAuditEventModel} from '../modules/auditoria/models/AuditEvent.js';

const schema=z.object({expectedStatus:z.enum(['ACTIVE','INACTIVE']),status:z.enum(['ACTIVE','INACTIVE']),expectedName:z.string().min(1).max(120)}).strict();
type RecordState={companyId:string;name:string;status:'ACTIVE'|'INACTIVE';branchId?:string};
export async function changeCatalogState<T extends RecordState>(model:Model<T>,input:{id:string;companyId:string;branchId:string;userId:string;module:string;branchScoped:boolean;expectedStatus:'ACTIVE'|'INACTIVE';status:'ACTIVE'|'INACTIVE';expectedName:string;ipAddress?:string}){
 if(input.expectedStatus===input.status)throw new AppError({code:'VALIDATION_ERROR',message:'Unchanged status',friendlyMessage:'Selecciona una acción diferente del estado actual.',statusCode:400});
 const audit=getAuditEventModel();await Promise.all([model.init(),audit.init()]);
 const session=await mongoose.startSession();
 try{return await session.withTransaction(async()=>{
  const row=await model.findOneAndUpdate({_id:input.id,companyId:input.companyId,...(input.branchScoped?{branchId:input.branchId}:{}),name:input.expectedName,status:input.expectedStatus},{$set:{status:input.status}},{new:true,runValidators:true,session}).exec();
  if(!row)throw new AppError({code:'CONFLICT',message:'Stale or unavailable catalog entry',friendlyMessage:'El registro cambió o no está disponible. Actualiza el listado antes de continuar.',statusCode:409});
  await audit.create([{userId:input.userId,companyId:input.companyId,branchId:input.branchId,module:input.module,entityId:String(row._id),action:input.status==='INACTIVE'?'DELETE':'UPDATE',details:{operation:input.status==='INACTIVE'?'ARCHIVE':'RESTORE',previousStatus:input.expectedStatus,status:input.status},ipAddress:input.ipAddress}],{session});
  return {id:String(row._id),name:row.name,status:row.status};
 });}finally{await session.endSession();}
}
export function catalogLifecycleRoutes<T extends RecordState>(config:{model:()=>Model<T>;permission:string;module:string;branchScoped:boolean}){
 const router=Router();
 router.patch('/:id/status',authenticate,tenant,authorize(config.permission),async(req,res,next)=>{try{
  const scope=req.tenant;if(!scope?.companyId||!scope.branchId||!scope.userId)throw new AppError({code:'UNAUTHORIZED',message:'Missing tenant',friendlyMessage:'Vuelve a iniciar sesión.',statusCode:401});
  const parsed=schema.safeParse(req.body);
  if(!parsed.success||parsed.data.status===parsed.data.expectedStatus||!/^[a-f0-9]{24}$/i.test(req.params.id))throw new AppError({code:'VALIDATION_ERROR',message:'Invalid catalog action',friendlyMessage:'Revisa el registro y la acción solicitada.',statusCode:400});
  res.json({ok:true,data:await changeCatalogState(config.model(),{...parsed.data,id:req.params.id,companyId:scope.companyId,branchId:scope.branchId,userId:scope.userId,module:config.module,branchScoped:config.branchScoped,ipAddress:req.ip})});
 }catch(error){next(error);}});return router;
}
