import {validateTransaction,type TransactionDraft,type TransactionKind} from './transactionApi';
import type {CatalogEntry} from './catalogApi';
export function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function reviewTransaction(kind:TransactionKind,draft:TransactionDraft,partner:CatalogEntry|null,product:CatalogEntry|null){
  try{
    if(!partner||!product||partner.id!==draft.partnerId||product.id!==draft.productId||partner.status!=='ACTIVE'||product.status!=='ACTIVE')throw new Error('Selecciona un contacto y un producto activos.');
    const payload=validateTransaction(kind,draft),unitPrice=kind==='sales'?product.price:Number(draft.unitCost);
    if(typeof unitPrice!=='number'||!Number.isFinite(unitPrice)||unitPrice<0)throw new Error('El precio no está disponible. Actualiza el producto.');
    const total=Math.round(unitPrice*payload.quantity*100)/100;
    if(!Number.isFinite(total)||!Number.isSafeInteger(Math.round(total*100)))throw new Error('La cantidad y el precio producen un importe demasiado grande.');
    return {ready:true as const,total,unitPrice,quantity:payload.quantity,message:''};
  }catch(error){return {ready:false as const,message:error instanceof Error?error.message:'Revisa los datos de la operación.'};}
}
