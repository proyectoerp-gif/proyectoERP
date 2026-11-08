import {z} from 'zod';
import {AppError} from '../../errors/AppError.js';
import {catalogFilter} from '../../core/catalogPagination.js';
import {getProductModel} from '../productos/models/Product.js';
import {getCategoryModel} from '../productos/models/Category.js';
import {demoScope} from './knowledge.js';

const querySchema=z.object({
  search:z.string().trim().max(80).default(''),
  cursor:z.string().max(200).optional(),
  sort:z.enum(['recent','price-asc','price-desc']).default('recent'),
  audience:z.enum(['Mujer','Hombre','Unisex']).optional(),
  size:z.enum(['XS','S','M','L','XL','XXL','Única']).optional(),
  color:z.string().trim().min(2).max(40).optional(),
  ids:z.string().regex(/^[a-f0-9]{24}(,[a-f0-9]{24}){0,39}$/i).optional(),
  category:z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  minPrice:z.coerce.number().finite().min(0).max(1e9).optional(),
  maxPrice:z.coerce.number().finite().min(0).max(1e9).optional(),
}).strict().refine(value=>value.minPrice===undefined||value.maxPrice===undefined||value.minPrice<=value.maxPrice);
// This publication is deliberately restricted to active products of the fictitious demo company.
// Production businesses need an explicit publication workflow before enabling a storefront.
export async function publicDemoCatalog(query:unknown){
  const parsed=querySchema.safeParse(query);
  if(!parsed.success)throw new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid public catalog query',friendlyMessage:'Revisa la búsqueda del catálogo.'});
  const limit=12;
  const data=parsed.data;
  const filter=catalogFilter({companyId:demoScope.companyId},{search:data.search,status:'ACTIVE',limit},['name','sku']);
  if(data.ids)filter._id={$in:data.ids.split(',')};
  if(data.audience)filter['apparel.audience']=data.audience;
  if(data.size)filter['apparel.sizes']=data.size;
  if(data.color)filter['apparel.color']=data.color;
  if(data.cursor){
    if(data.sort==='recent'){
      if(!/^[a-f0-9]{24}$/i.test(data.cursor))throw invalidCursor();
      filter._id={...(filter._id as object??{}),$lt:data.cursor};
    }else{
      let value;
      try{value=JSON.parse(Buffer.from(data.cursor,'base64url').toString());}catch{throw invalidCursor();}
      if(!value||value.sort!==data.sort||typeof value.id!=='string'||! /^[a-f0-9]{24}$/i.test(value.id)||typeof value.price!=='number'||!Number.isFinite(value.price)||value.price<0)throw invalidCursor();
      const direction=data.sort==='price-asc'?'$gt':'$lt';
      filter.$and=[{$or:[{price:{[direction]:value.price}},{price:value.price,_id:{[direction]:value.id}}]}];
    }
  }
  if(parsed.data.category)filter.categoryId=parsed.data.category;
  if(parsed.data.minPrice!==undefined||parsed.data.maxPrice!==undefined)filter.price={
    ...(parsed.data.minPrice!==undefined?{$gte:parsed.data.minPrice}:{}),
    ...(parsed.data.maxPrice!==undefined?{$lte:parsed.data.maxPrice}:{}),
  };
  const rows=await getProductModel().find(filter).select('_id name sku price categoryId imageVersion apparel').sort(data.sort==='price-asc'?{price:1,_id:1}:data.sort==='price-desc'?{price:-1,_id:-1}:{_id:-1}).limit(limit+1).lean().exec();
  const selected=rows.slice(0,limit),ids=[...new Set(selected.map(row=>row.categoryId))];
  const categories=await getCategoryModel().find({companyId:demoScope.companyId,_id:{$in:ids},status:'ACTIVE'}).select('_id name').lean().exec();
  const names=new Map(categories.map(row=>[String(row._id),row.name]));
  const availableCategories=await getCategoryModel().find({companyId:demoScope.companyId,status:'ACTIVE'}).select('_id name').sort({name:1}).limit(100).lean().exec();
  return {items:selected.map(row=>({id:String(row._id),name:row.name,sku:row.sku,price:row.price,category:names.get(row.categoryId)??'Otros artículos',...(row.imageVersion?{imageVersion:row.imageVersion}:{}),...(row.apparel?{apparel:row.apparel}:{})})),nextCursor:rows.length>limit?(data.sort==='recent'?String(selected[selected.length-1]._id):Buffer.from(JSON.stringify({id:String(selected[selected.length-1]._id),price:selected[selected.length-1].price,sort:data.sort})).toString('base64url')):null,currency:'MXN' as const,categories:availableCategories.map(row=>({id:String(row._id),name:row.name}))};
}

function invalidCursor(){return new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid catalog cursor',friendlyMessage:'Vuelve a la primera página del catálogo.'});}
