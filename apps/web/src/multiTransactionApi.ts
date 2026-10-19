import {ApiError,requestData} from './webApi';
import {parseTransaction,validateTransaction,type TransactionKind} from './transactionApi';
import type {CatalogEntry} from './catalogApi';
import {reviewTransaction} from './operationReview';
export type CartLine={product:CatalogEntry;quantity:string;unitCost:string};
export function cartPayload(kind:TransactionKind,partnerId:string,lines:CartLine[]){
 if(!lines.length||lines.length>20||new Set(lines.map(l=>l.product.id)).size!==lines.length)throw new ApiError('Agrega entre 1 y 20 productos distintos.');
 const items=lines.map(line=>{
  const payload=validateTransaction(kind,{partnerId,productId:line.product.id,quantity:line.quantity,unitCost:line.unitCost});
  if(payload.quantity>1e9||kind==='purchase-orders'&&Number(line.unitCost)>1e12)throw new ApiError('La cantidad o el costo supera el límite admitido.');
  return {productId:payload.productId,quantity:payload.quantity,...(kind==='purchase-orders'?{unitCost:Number(line.unitCost)}:{})};
 });
 return kind==='sales'?{customerId:partnerId,items}:{supplierId:partnerId,items};
}
export function reviewCart(kind:TransactionKind,partner:CatalogEntry|null,lines:CartLine[]){
 try{
  cartPayload(kind,partner?.id??'',lines);
  if(kind==='sales'&&lines.some(line=>typeof line.product.price==='number'&&line.product.price!==Number(line.product.price.toFixed(2))))throw new ApiError('Actualiza los precios del catálogo: se admiten hasta dos decimales.');
  const totals=lines.map(line=>{const review=reviewTransaction(kind,{partnerId:partner?.id??'',productId:line.product.id,quantity:line.quantity,unitCost:line.unitCost},partner,line.product);if(!review.ready)throw new ApiError(`${line.product.name}: ${review.message}`);return review;});
  const cents=totals.reduce((n,r)=>n+Math.round(r.total*100),0);if(!Number.isSafeInteger(cents)||Math.round(cents/100*100)!==cents)throw new ApiError('El total supera el importe admitido.');
  return {ready:true as const,total:cents/100,totals,message:''};
 }catch(e){return {ready:false as const,message:e instanceof Error?e.message:'Revisa los artículos.'};}
}
export async function createMultiTransactionRequest(base:string,token:string,kind:TransactionKind,partnerId:string,lines:CartLine[],signal:AbortSignal){
 const payload=cartPayload(kind,partnerId,lines);
 try{
  const row=parseTransaction(await requestData(base,'/'+kind,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal}),kind);
  if(row.partnerId!==partnerId||row.status!=='PENDIENTE'||row.items?.length!==payload.items.length||row.items.some((item,index)=>item.productId!==payload.items[index].productId||item.quantity!==payload.items[index].quantity||kind==='purchase-orders'&&item.unitPrice!==payload.items[index].unitCost))throw new ApiError('No se pudo confirmar el documento completo.');
  return row;
 }catch(e){if(e instanceof ApiError&&e.status>=400&&e.status<500)throw e;throw new ApiError('No se pudo confirmar el guardado. Revisa el listado antes de repetir; podría haberse registrado.');}
}
