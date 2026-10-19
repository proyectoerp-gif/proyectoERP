import {createHash} from 'node:crypto';
import mongoose,{type ClientSession} from 'mongoose';
import {Router} from 'express';
import {z} from 'zod';
import {AppError} from '../../errors/AppError.js';
import {authenticate} from '../../middleware/authenticate.js';
import {tenant} from '../../middleware/tenant.js';
import {authorizeSettlement} from '../../middleware/authorizeSettlement.js';
import {getSaleModel} from './models/Sale.js';
import {getPurchaseOrderModel} from '../compras/models/PurchaseOrder.js';
import {getSettlementModel} from './commercialSettlement.js';
import {getProductModel} from '../productos/models/Product.js';
import {getBankAccountModel,getCashMovementModel} from '../finanzas/models/FinanceModels.js';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {recordCommercialStock} from '../inventario/stockService.js';
import {getStockMovementModel} from '../inventario/models/StockMovement.js';
import {getStockLockModel} from '../inventario/models/StockLock.js';
import {persistedItems} from '../../core/commercialItems.js';
import {getCommercialActivityModel,type CommercialActivity,type ActivityEvent} from './commercialActivityModels.js';
type Scope={companyId:string;branchId:string;userId:string};
const id=z.string().regex(/^[a-f0-9]{24}$/i).transform(v=>v.toLowerCase());
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
const keySchema=z.object({kind:z.enum(['sales','purchase-orders']),sourceId:id}).strict();
const base=keySchema.extend({requestId:z.string().uuid(),expectedVersion:z.number().int().min(0),date,note:z.string().trim().min(3).max(300)});
const amount=z.number().finite().positive().refine(v=>Number.isSafeInteger(Math.round(v*100))&&v===Number(v.toFixed(2)));
const quantity=z.number().finite().min(0.000001).max(1e9).refine(v=>Math.abs(v*1e6-Math.round(v*1e6))<.001);
const stockFields={warehouseId:id,items:z.array(z.object({productId:id,quantity}).strict()).min(1).max(20)};
export const activityInput=z.discriminatedUnion('action',[
 base.extend({action:z.literal('PAYMENT'),accountId:id,amount}).strict(),base.extend({action:z.literal('REFUND'),accountId:id,amount}).strict(),
 base.extend({action:z.literal('DELIVERY'),...stockFields}).strict(),base.extend({action:z.literal('RETURN'),...stockFields}).strict(),base.extend({action:z.literal('TERMS'),dueDate:date}).strict(),base.extend({action:z.literal('CANCEL')}).strict()
]);
const fail=(message:string,statusCode=409)=>new AppError({code:statusCode===400?'VALIDATION_ERROR':'CONFLICT',message:'Commercial activity rejected',friendlyMessage:message,statusCode});
const micros=(v:number)=>Math.round(v*1e6);
export function activitySummary(state:CommercialActivity){
 const returnedCents=state.items.reduce((sum,item)=>{const denominator=BigInt(micros(item.quantity)),numerator=BigInt(Math.round(item.total*100))*BigInt(micros(item.returned));return sum+Number((numerator*2n+denominator)/(denominator*2n));},0);
 const netCents=Math.round(state.total*100)-returnedCents,netPaid=state.paidCents-state.refundedCents;
 return {total:state.total,returnedValue:returnedCents/100,netTotal:netCents/100,paid:state.paidCents/100,refunded:state.refundedCents/100,netPaid:netPaid/100,outstanding:Math.max(0,netCents-netPaid)/100,refundable:Math.max(0,netPaid-netCents)/100};
}
function publicState(state:CommercialActivity,unknownLegacy=false){return {kind:state.kind,sourceId:state.sourceId,version:state.version,items:state.items,events:state.events.map(({fingerprint,...event})=>event),dueDate:state.dueDate??null,legacyReceiptId:state.legacyReceiptId??null,unknownLegacy,canceled:state.canceled??false,...activitySummary(state)};}
async function initialState(scope:Scope,key:z.infer<typeof keySchema>,source:any,session?:ClientSession):Promise<{state:CommercialActivity;unknownLegacy:boolean}>{
 const stored=await getCommercialActivityModel().findOne({...key,companyId:scope.companyId,branchId:scope.branchId}).session(session??null).lean().exec();if(stored)return {state:stored,unknownLegacy:false};
 const receipt=await getSettlementModel().findOne({...key,companyId:scope.companyId,branchId:scope.branchId}).session(session??null).lean().exec();
 const items=[];for(const item of persistedItems(source)){let productName=item.productName,sku=item.sku;if(!productName){const product=await getProductModel().findOne({_id:item.productId,companyId:scope.companyId}).session(session??null).select('name sku').lean();productName=product?.name??item.productId;sku=product?.sku??'';}items.push({...item,productName,sku,delivered:receipt?item.quantity:0,returned:0});}
 return {state:{...key,companyId:scope.companyId,branchId:scope.branchId,version:0,canceled:source.status==='CANCELADA',total:source.total,paidCents:receipt?Math.round(source.total*100):0,refundedCents:0,items,events:[],...(receipt?{legacyReceiptId:String(receipt._id)}:{})},unknownLegacy:!receipt&&['PAGADA','RECIBIDA'].includes(source.status)};
}
async function sourceRecord(scope:Scope,key:z.infer<typeof keySchema>,session?:ClientSession,write=false){
 const filter={_id:key.sourceId,companyId:scope.companyId,branchId:scope.branchId,...(write?{status:{$ne:'CANCELADA'}}:{})};
 const row=key.kind==='sales'?(write?await getSaleModel().findOneAndUpdate(filter,{$inc:{activityVersion:1}},{new:true,session}).lean():await getSaleModel().findOne(filter).session(session??null).lean()):(write?await getPurchaseOrderModel().findOneAndUpdate(filter,{$inc:{activityVersion:1}},{new:true,session}).lean():await getPurchaseOrderModel().findOne(filter).session(session??null).lean());
 if(!row)throw fail('El documento no está disponible en esta sucursal o está cancelado.');return row;
}
export async function readCommercialActivity(scope:Scope,raw:unknown){const parsed=keySchema.safeParse(raw);if(!parsed.success)throw fail('Revisa el documento solicitado.',400);const source=await sourceRecord(scope,parsed.data);const result=await initialState(scope,parsed.data,source);return publicState(result.state,result.unknownLegacy);}
export async function writeCommercialActivity(scope:Scope,raw:unknown){
 const parsed=activityInput.safeParse(raw);if(!parsed.success)throw fail('Revisa el importe, las cantidades, la fecha y la referencia.',400);const input=parsed.data,key={kind:input.kind,sourceId:input.sourceId};
 const fingerprint=createHash('sha256').update(JSON.stringify({...input,expectedVersion:undefined})).digest('hex');
 await Promise.all([getCommercialActivityModel().init(),getSettlementModel().init(),getStockMovementModel().init(),getStockLockModel().init(),getCashMovementModel().init(),getAuditEventModel().init(),getSaleModel().init(),getPurchaseOrderModel().init()]);
 const session=await mongoose.startSession();
 try{return await session.withTransaction(async()=>{
  const cached=await getCommercialActivityModel().findOne({...key,companyId:scope.companyId,branchId:scope.branchId}).session(session).lean();const repeated=cached?.events.find(event=>event.requestId===input.requestId);if(repeated){if(repeated.fingerprint!==fingerprint)throw fail('La solicitud pendiente cambió.');return publicState(cached!);}
  const source=await sourceRecord(scope,key,session,true);if(input.kind==='purchase-orders'&&source.status==='PENDIENTE')throw fail('Aprueba la compra antes de registrar pagos o recepciones.');
  const {state,unknownLegacy}=await initialState(scope,key,source,session);if(unknownLegacy)throw fail('Este documento antiguo no tiene comprobante conjunto. Revisa su historial antes de registrar movimientos.');
  const previous=state.events.find(event=>event.requestId===input.requestId);if(previous){if(previous.fingerprint!==fingerprint)throw fail('La solicitud pendiente cambió. Actualiza el seguimiento.');return publicState(state);}
  if(state.version!==input.expectedVersion)throw fail('El seguimiento cambió. Actualiza antes de registrar otra operación.');if(state.events.length>=100)throw fail('Este documento llegó al límite de 100 movimientos de seguimiento.');
  const event:ActivityEvent={requestId:input.requestId,fingerprint,action:input.action,date:input.date,note:input.note,userId:scope.userId,createdAt:new Date().toISOString()};
  if(input.action==='PAYMENT'||input.action==='REFUND'){
   const summary=activitySummary(state),cents=Math.round(input.amount*100),limit=Math.round((input.action==='PAYMENT'?summary.outstanding:summary.refundable)*100);if(cents>limit)throw fail(input.action==='PAYMENT'?'El importe supera el saldo pendiente.':'El reembolso supera el importe disponible tras las devoluciones.');
   if(!await getBankAccountModel().exists({_id:input.accountId,companyId:scope.companyId,branchId:scope.branchId,status:'ACTIVE'}).session(session))throw fail('Selecciona una cuenta activa de esta sucursal.',400);
   const inflow=(input.kind==='sales')===(input.action==='PAYMENT');const [cash]=await getCashMovementModel().create([{companyId:scope.companyId,branchId:scope.branchId,accountId:input.accountId,concept:`${input.action}:${input.sourceId}:${input.requestId}`,type:inflow?'INFLOW':'OUTFLOW',amount:input.amount,date:input.date}],{session});
   if(input.action==='PAYMENT')state.paidCents+=cents;else state.refundedCents+=cents;Object.assign(event,{amount:input.amount,accountId:input.accountId,cashMovementId:String(cash._id)});
  }else if(input.action==='DELIVERY'||input.action==='RETURN'){
   if(new Set(input.items.map(item=>item.productId)).size!==input.items.length)throw fail('No repitas un producto en el mismo movimiento.',400);
   const movements=[];for(const item of [...input.items].sort((a,b)=>a.productId.localeCompare(b.productId))){const line=state.items.find(line=>line.productId===item.productId);if(!line)throw fail('El producto no pertenece al documento.',400);
    const limit=input.action==='DELIVERY'?micros(line.quantity)-micros(line.delivered):micros(line.delivered)-micros(line.returned);if(micros(item.quantity)>limit)throw fail(input.action==='DELIVERY'?'La cantidad supera lo pendiente de entregar o recibir.':'No puedes devolver más de lo entregado o recibido.');
    const receipt=(input.kind==='purchase-orders')===(input.action==='DELIVERY');const stock=await recordCommercialStock({...scope,warehouseId:input.warehouseId,productId:item.productId,quantity:item.quantity,reference:`ACT:${input.sourceId}:${input.requestId}:${state.items.indexOf(line)}`},receipt?'RECEIPT':'ISSUE',session,input.action==='RETURN');
    if(input.action==='DELIVERY')line.delivered=(micros(line.delivered)+micros(item.quantity))/1e6;else line.returned=(micros(line.returned)+micros(item.quantity))/1e6;movements.push({...item,movementId:stock.id});
   }Object.assign(event,{warehouseId:input.warehouseId,items:movements});
  }else if(input.action==='TERMS'){state.dueDate=input.dueDate;event.dueDate=input.dueDate;}else{if(state.paidCents||state.refundedCents||state.items.some(item=>item.delivered))throw fail('Un documento con pagos o entregas requiere devolución y reembolso, no cancelación.');state.canceled=true;}
  state.events.push(event);state.version++;
  await getCommercialActivityModel().findOneAndUpdate({...key,companyId:scope.companyId,branchId:scope.branchId},{$set:{version:state.version,total:state.total,items:state.items,events:state.events,paidCents:state.paidCents,refundedCents:state.refundedCents,dueDate:state.dueDate,canceled:state.canceled??false,...(state.legacyReceiptId?{legacyReceiptId:state.legacyReceiptId}:{})}},{upsert:true,new:true,runValidators:true,session});
  const summary=activitySummary(state),complete=state.items.every(item=>micros(item.delivered)===micros(item.quantity))&&summary.outstanding===0&&summary.refundable===0;
  if(state.canceled){const filter={_id:input.sourceId,companyId:scope.companyId,branchId:scope.branchId};if(input.kind==='sales')await getSaleModel().updateOne(filter,{$set:{status:'CANCELADA'}},{session});else await getPurchaseOrderModel().updateOne(filter,{$set:{status:'CANCELADA'}},{session});}else if(complete){const filter={_id:input.sourceId,companyId:scope.companyId,branchId:scope.branchId};if(input.kind==='sales')await getSaleModel().updateOne(filter,{$set:{status:'PAGADA'}},{session});else await getPurchaseOrderModel().updateOne(filter,{$set:{status:'RECIBIDA'}},{session});}
  await getAuditEventModel().create([{...scope,action:'UPDATE',module:input.kind==='sales'?'ventas':'compras',entityId:input.sourceId,details:{operation:input.action,requestId:input.requestId,version:state.version,cashMovementId:event.cashMovementId,stockMovementIds:event.items?.map(item=>item.movementId),note:input.note}}],{session});return publicState(state);
 });}catch(e){if(typeof e==='object'&&e!==null&&'code'in e&&e.code===11000)throw fail('El seguimiento cambió. Reintenta la misma solicitud para comprobar el resultado.');throw e;}finally{await session.endSession();}
}
export function createCommercialActivityRoutes(){const router=Router();router.get('/activity',authenticate,tenant,authorizeSettlement(false),async(req,res,next)=>{try{res.json({ok:true,data:await readCommercialActivity(req.tenant as Scope,req.query)});}catch(e){next(e);}});router.post('/activity',authenticate,tenant,authorizeSettlement(true),async(req,res,next)=>{try{res.json({ok:true,data:await writeCommercialActivity(req.tenant as Scope,req.body)});}catch(e){next(e);}});return router;}
