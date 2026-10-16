import {z} from 'zod';
import {AppError} from '../../errors/AppError.js';
import {catalogFilter} from '../../core/catalogPagination.js';
import {getProductModel} from '../productos/models/Product.js';
import {getCategoryModel} from '../productos/models/Category.js';
import {demoScope} from './knowledge.js';

const querySchema=z.object({search:z.string().trim().max(80).default(''),cursor:z.string().regex(/^[a-f0-9]{24}$/i).optional()}).strict();
// This publication is deliberately restricted to active products of the fictitious demo company.
// Production businesses need an explicit publication workflow before enabling a storefront.
export async function publicDemoCatalog(query:unknown){
  const parsed=querySchema.safeParse(query);
  if(!parsed.success)throw new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid public catalog query',friendlyMessage:'Revisa la búsqueda del catálogo.'});
  const limit=12;
  const filter=catalogFilter({companyId:demoScope.companyId},{...parsed.data,status:'ACTIVE',limit},['name','sku']);
  const rows=await getProductModel().find(filter).select('_id name sku price categoryId').sort({_id:-1}).limit(limit+1).lean().exec();
  const selected=rows.slice(0,limit),ids=[...new Set(selected.map(row=>row.categoryId))];
  const categories=await getCategoryModel().find({companyId:demoScope.companyId,_id:{$in:ids},status:'ACTIVE'}).select('_id name').lean().exec();
  const names=new Map(categories.map(row=>[String(row._id),row.name]));
  return {items:selected.map(row=>({id:String(row._id),name:row.name,sku:row.sku,price:row.price,category:names.get(row.categoryId)??'Otros artículos'})),nextCursor:rows.length>limit?String(selected[selected.length-1]._id):null,currency:null};
}
