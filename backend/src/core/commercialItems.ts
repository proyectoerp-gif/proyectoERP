import {Schema,type ClientSession} from 'mongoose';
import {z} from 'zod';
import {AppError} from '../errors/AppError.js';
import {commercialTotal} from './commercialAmount.js';
import {getProductModel} from '../modules/productos/models/Product.js';

export type CommercialItem={productId:string;productName:string;sku:string;quantity:number;unitPrice:number;total:number};
export const commercialItemDefinition={productId:{type:String,required:true},productName:{type:String,required:true},sku:{type:String,required:true},quantity:{type:Number,required:true,min:0.000001},unitPrice:{type:Number,required:true,min:0},total:{type:Number,required:true,min:0}};
export const commercialItemSchema=new Schema<CommercialItem>(commercialItemDefinition,{_id:false});
const id=z.string().regex(/^[a-f0-9]{24}$/i).transform(v=>v.toLowerCase());
const quantity=z.number().finite().min(0.000001).max(1e9).refine(v=>Math.abs(v*1e6-Math.round(v*1e6))<0.001);
export const saleItemsInput=z.object({customerId:id,items:z.array(z.object({productId:id,quantity}).strict()).min(1).max(20)}).strict();
export const purchaseItemsInput=z.object({supplierId:id,items:z.array(z.object({productId:id,quantity,unitCost:z.number().finite().min(0).max(1e12).refine(v=>v===Number(v.toFixed(2)))}).strict()).min(1).max(20)}).strict();
export const itemsError=()=>new AppError({code:'VALIDATION_ERROR',message:'Invalid commercial items',friendlyMessage:'Revisa los artículos: máximo 20 productos distintos, cantidades positivas de hasta seis decimales y costos de hasta dos decimales.',statusCode:400});
export function sumItemTotals(items:Pick<CommercialItem,'total'>[]){
 const cents=items.reduce((sum,item)=>sum+Math.round(item.total*100),0);
 if(!Number.isSafeInteger(cents)||cents<0||Math.round(cents/100*100)!==cents)throw itemsError();return cents/100;
}
export async function prepareCommercialItems(companyId:string,items:{productId:string;quantity:number;unitCost?:number}[],sale:boolean,session?:ClientSession){
 if(!items.length||items.length>20||new Set(items.map(i=>i.productId.toLowerCase())).size!==items.length)throw itemsError();
 const result:CommercialItem[]=[];
 for(const item of items){
  const product=await getProductModel().findOne({_id:item.productId,companyId,status:'ACTIVE'}).session(session??null).select('name sku price').lean().exec();
  if(!product)throw new AppError({code:'VALIDATION_ERROR',message:'Invalid product',friendlyMessage:'Todos los productos deben estar activos y pertenecer a tu empresa. Actualiza el catálogo.',statusCode:400});
  const unitPrice=sale?Number(product.price):item.unitCost!;
  if(!Number.isFinite(unitPrice)||unitPrice<0||unitPrice!==Number(unitPrice.toFixed(2)))throw new AppError({code:'VALIDATION_ERROR',message:'Invalid unit amount precision',friendlyMessage:'Actualiza el precio o costo del artículo: se admiten hasta dos decimales.',statusCode:400});
  result.push({productId:item.productId,productName:product.name,sku:product.sku,quantity:item.quantity,unitPrice,total:commercialTotal(item.quantity,unitPrice)});
 }
 sumItemTotals(result);return result;
}
export function persistedItems(row:{productId:string;quantity:number;unitPrice?:number;unitCost?:number;total:number;items?:CommercialItem[]}){
 if(!row.items?.length)return [{productId:row.productId,quantity:row.quantity,unitPrice:row.unitPrice??row.unitCost!,total:row.total,productName:'',sku:''}];
 const items=row.items;
 if(items.length>20||new Set(items.map(i=>i.productId)).size!==items.length||items.some(i=>!id.safeParse(i.productId).success||!quantity.safeParse(i.quantity).success||!Number.isFinite(i.unitPrice)||i.unitPrice<0||i.total!==commercialTotal(i.quantity,i.unitPrice))||sumItemTotals(items)!==row.total||items[0].productId!==row.productId||items[0].quantity!==row.quantity||items[0].unitPrice!==(row.unitPrice??row.unitCost))throw itemsError();
 return items;
}
