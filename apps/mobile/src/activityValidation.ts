import type {Activity,ActivityAction,ActivityDraft} from './commercialActivityApi';
export const activityLabels:Record<ActivityAction,string>={PAYMENT:'Pago o cobro',DELIVERY:'Entrega o recepción',RETURN:'Devolución',REFUND:'Reembolso o reintegro',TERMS:'Fecha límite de pago',CANCEL:'Cancelar sin movimientos'};
export function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function activityPayload(data:Activity,form:{action:ActivityAction;date:string;note:string;amount:string;dueDate:string;accountId?:string;warehouseId?:string;quantities:Record<string,string>}):ActivityDraft{
 if(data.canceled||data.unknownLegacy)throw new Error('Este documento no permite nuevos movimientos.');
 if(!validDate(form.date)||form.note.trim().length<3||form.note.trim().length>300)throw new Error('Revisa la fecha y escribe una referencia de 3 a 300 caracteres.');
 const payload:ActivityDraft={action:form.action,date:form.date,note:form.note.trim()};
 if(form.action==='PAYMENT'||form.action==='REFUND'){
  const amount=Number(form.amount),limit=form.action==='PAYMENT'?data.outstanding:data.refundable;
  if(!form.accountId||!/^[a-f\d]{24}$/i.test(form.accountId)||!/^\d+(?:\.\d{1,2})?$/.test(form.amount)||!Number.isFinite(amount)||amount<=0||Math.round(amount*100)>Math.round(limit*100))throw new Error('Selecciona una cuenta y un importe positivo dentro del saldo disponible, con hasta dos decimales.');
  payload.accountId=form.accountId;payload.amount=amount;
 }else if(form.action==='DELIVERY'||form.action==='RETURN'){
  if(!form.warehouseId||!/^[a-f\d]{24}$/i.test(form.warehouseId))throw new Error('Selecciona un almacén activo.');
  payload.warehouseId=form.warehouseId;payload.items=[];
  for(const line of data.items){const value=form.quantities[line.productId]?.trim();if(!value)continue;const quantity=Number(value),limit=Math.round((form.action==='DELIVERY'?line.quantity-line.delivered:line.delivered-line.returned)*1e6)/1e6;if(!/^\d+(?:\.\d{1,6})?$/.test(value)||!Number.isFinite(quantity)||quantity<=0||quantity>limit)throw new Error('Revisa la cantidad de '+line.productName+'.');payload.items.push({productId:line.productId,quantity});}
  if(!payload.items.length)throw new Error('Indica al menos una cantidad para este movimiento.');
 }else if(form.action==='TERMS'){if(!validDate(form.dueDate))throw new Error('Escribe una fecha límite válida.');payload.dueDate=form.dueDate;
 }else if(form.action==='CANCEL'){if(data.paid!==0||data.items.some(i=>i.delivered!==0))throw new Error('Usa devoluciones y reembolsos para documentos con movimientos.');}
 else throw new Error('Selecciona una acción válida.');
 return payload;
}
export function activityRequestId(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16);});}
