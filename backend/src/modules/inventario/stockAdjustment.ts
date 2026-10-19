import {createHash} from 'node:crypto';
import mongoose,{Schema} from 'mongoose';
import {Router} from 'express';
import {z} from 'zod';
import {authorize} from '../../middleware/authorize.js';
import {AppError} from '../../errors/AppError.js';
import {getStockMovementModel} from './models/StockMovement.js';
import {getStockLockModel} from './models/StockLock.js';
import {getWarehouseModel} from './models/Warehouse.js';
import {getProductModel} from '../productos/models/Product.js';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {recordCommercialStock} from './stockService.js';
type Scope={companyId:string;branchId:string;userId:string};
const id=z.string().regex(/^[a-f0-9]{24}$/i).transform(v=>v.toLowerCase()),quantity=z.number().finite().min(0).max(1e9).refine(v=>Math.abs(v*1e6-Math.round(v*1e6))<.001);
const keySchema=z.object({productId:id,warehouseId:id}).strict();
const inputSchema=keySchema.extend({requestId:z.string().uuid(),countedQuantity:quantity,expectedQuantity:quantity,reason:z.string().trim().min(3).max(300)}).strict();
type Adjustment={companyId:string;branchId:string;requestId:string;fingerprint:string;productId:string;warehouseId:string;before:number;after:number;difference:number;movementId:string;reason:string};
const schema=new Schema<Adjustment>({companyId:String,branchId:String,requestId:String,fingerprint:String,productId:String,warehouseId:String,before:Number,after:Number,difference:Number,movementId:String,reason:String},{timestamps:true});schema.index({companyId:1,branchId:1,requestId:1},{unique:true});
export function getStockAdjustmentModel():mongoose.Model<Adjustment>{return mongoose.models.StockAdjustment??mongoose.model<Adjustment>('StockAdjustment',schema);}
const fail=(text:string,code=409)=>new AppError({code:code===400?'VALIDATION_ERROR':'CONFLICT',message:'Stock count rejected',friendlyMessage:text,statusCode:code});
async function balance(scope:Scope,key:{productId:string;warehouseId:string},session?:mongoose.ClientSession){
 const rows=await getStockMovementModel().aggregate([{$match:{companyId:scope.companyId,branchId:scope.branchId,productId:key.productId}},{$project:{effects:{$concatArrays:[[{warehouseId:'$warehouseId',quantity:'$quantity'}],{$cond:[{$eq:['$kind','TRANSFER']},[{warehouseId:'$destinationWarehouseId',quantity:{$multiply:['$quantity',-1]}}],[]]}]}}},{$unwind:'$effects'},{$match:{'effects.warehouseId':key.warehouseId}},{$group:{_id:null,quantity:{$sum:'$effects.quantity'}}}]).session(session??null);return Math.round((rows[0]?.quantity??0)*1e6)/1e6;
}
export async function readStockCount(scope:Scope,raw:unknown){const parsed=keySchema.safeParse(raw);if(!parsed.success)throw fail('Selecciona producto y almacén.',400);const key=parsed.data;if(!await getProductModel().exists({_id:key.productId,companyId:scope.companyId})||!await getWarehouseModel().exists({_id:key.warehouseId,companyId:scope.companyId,branchId:scope.branchId}))throw fail('Producto o almacén no disponible en tu sucursal.',400);return {...key,quantity:await balance(scope,key)};}
export async function adjustStockCount(scope:Scope,raw:unknown){
 const parsed=inputSchema.safeParse(raw);if(!parsed.success)throw fail('Revisa el conteo, el saldo consultado y el motivo.',400);const input=parsed.data,fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex'),Model=getStockAdjustmentModel();
 await Promise.all([Model.init(),getStockMovementModel().init(),getStockLockModel().init(),getAuditEventModel().init()]);const session=await mongoose.startSession();try{return await session.withTransaction(async()=>{
  const existing=await Model.findOne({companyId:scope.companyId,branchId:scope.branchId,requestId:input.requestId}).session(session).lean();if(existing){if(existing.fingerprint!==fingerprint)throw fail('La solicitud pendiente cambió.');const {_id,fingerprint:_,...result}=existing;return {id:String(_id),...result};}
  const current=await balance(scope,input,session);if(current!==input.expectedQuantity)throw fail('Las existencias cambiaron. Consulta de nuevo antes de ajustar.');const difference=Math.round((input.countedQuantity-current)*1e6)/1e6;if(!difference)throw fail('El conteo coincide con el saldo; no hace falta un ajuste.',400);
  const movement=await recordCommercialStock({...scope,productId:input.productId,warehouseId:input.warehouseId,quantity:Math.abs(difference),reference:'ADJUST:'+input.requestId},difference>0?'RECEIPT':'ISSUE',session);
  const [row]=await Model.create([{companyId:scope.companyId,branchId:scope.branchId,...input,fingerprint,before:current,after:input.countedQuantity,difference,movementId:movement.id}],{session});
  await getAuditEventModel().create([{...scope,action:'CREATE',module:'inventario.ajustes',entityId:String(row._id),details:{productId:input.productId,warehouseId:input.warehouseId,before:current,after:input.countedQuantity,difference,movementId:movement.id,reason:input.reason}}],{session});
  return {id:String(row._id),companyId:scope.companyId,branchId:scope.branchId,requestId:input.requestId,productId:input.productId,warehouseId:input.warehouseId,before:current,after:input.countedQuantity,difference,movementId:movement.id,reason:input.reason};
 });}finally{await session.endSession();}
}
export function stockCountRoutes(){const router=Router();router.get('/count',authorize('inventario.ver'),async(req,res,next)=>{try{res.json({ok:true,data:await readStockCount(req.tenant as Scope,req.query)});}catch(e){next(e);}});router.post('/adjustments',authorize('inventario.editar'),async(req,res,next)=>{try{res.json({ok:true,data:await adjustStockCount(req.tenant as Scope,req.body)});}catch(e){next(e);}});return router;}
