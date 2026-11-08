import type {GarmentKind} from './GarmentArt';
export type PublicApparel={audience:'Mujer'|'Hombre'|'Unisex';sizes:string[];color:string;colorHex:string;material:string;description:string;garment:GarmentKind};
export type PublicProduct={id:string;name:string;sku:string;price:number;category:string;imageVersion?:string;apparel?:PublicApparel};
export type PublicCategory={id:string;name:string};
export type PublicCatalog={items:PublicProduct[];nextCursor:string|null;currency:'MXN'|null;categories?:PublicCategory[]};
export type PublicCatalogFilters={category?:string;minPrice?:string;maxPrice?:string;audience?:string;size?:string;color?:string;sort?:string;ids?:string};
const idPattern=/^[a-f0-9]{24}$/i;
export async function loadPublicCatalog(base:string,search:string,cursor:string,signal:AbortSignal,filters:PublicCatalogFilters={}):Promise<PublicCatalog>{
  const query=new URLSearchParams({search});if(cursor)query.set('cursor',cursor);
  if(filters.category)query.set('category',filters.category);
  for(const key of ['minPrice','maxPrice','audience','size','color','sort','ids'] as const)if(filters[key]?.trim())query.set(key,filters[key]!.trim());
  const response=await fetch(base+'/demo-support/catalog?'+query,{signal,cache:'no-store'});
  if(!response.ok)throw new Error(response.status===404?'El catálogo solo está disponible en la demo.':response.status===429?'Espera un minuto antes de volver a consultar.':'No pudimos cargar el catálogo. Intenta de nuevo.');
  const body=await response.json(),page=body?.data;
  if(body?.ok!==true||!page||!Array.isArray(page.items)||page.items.length>12||(page.currency!==null&&page.currency!=='MXN')||!(page.nextCursor===null||typeof page.nextCursor==='string'&&page.nextCursor.length<=200))throw new Error('No pudimos confirmar el catálogo.');
  const ids=new Set<string>();
  if(page.categories!==undefined&&(!Array.isArray(page.categories)||page.categories.length>100||page.categories.some((category:PublicCategory)=>!category||!idPattern.test(category.id)||typeof category.name!=='string'||!category.name.trim()||category.name.length>120)||new Set(page.categories.map((category:PublicCategory)=>category.id)).size!==page.categories.length))throw new Error('No pudimos confirmar las categorías.');
  for(const row of page.items){
    if(row?.imageVersion!==undefined&&(typeof row.imageVersion!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.imageVersion)))throw new Error('No pudimos confirmar la imagen del producto.');
    if(!row||typeof row.id!=='string'||!idPattern.test(row.id)||ids.has(row.id)||!['name','sku','category'].every(key=>typeof row[key]==='string'&&row[key].trim().length>0&&row[key].length<=120)||typeof row.price!=='number'||!Number.isFinite(row.price)||row.price<0)throw new Error('No pudimos confirmar los productos.');
    if(row.apparel!==undefined){const a=row.apparel;if(!a||!['Mujer','Hombre','Unisex'].includes(a.audience)||!Array.isArray(a.sizes)||!a.sizes.length||a.sizes.length>7||a.sizes.some((size:unknown)=>typeof size!=='string'||!['XS','S','M','L','XL','XXL','Única'].includes(size))||typeof a.colorHex!=='string'||!/^#[a-f0-9]{6}$/i.test(a.colorHex)||!['color','material','description'].every(key=>typeof a[key]==='string'&&a[key].trim().length>0&&a[key].length<=700)||!['tee','shirt','knit','trousers','jeans','skirt','dress','blazer','jacket','coat','bag','cap','scarf'].includes(a.garment))throw new Error('No pudimos confirmar la prenda.');}
    ids.add(row.id);
  }
  let cursorMatches=true;
  if(page.nextCursor){
    if(!filters.sort||filters.sort==='recent')cursorMatches=page.items.at(-1)?.id===page.nextCursor;
    else{try{const c=JSON.parse(atob(page.nextCursor.replace(/-/g,'+').replace(/_/g,'/')));cursorMatches=c.id===page.items.at(-1)?.id&&c.price===page.items.at(-1)?.price&&c.sort===filters.sort;}catch{cursorMatches=false;}}
  }
  if(page.nextCursor&&(page.items.length!==12||!cursorMatches))throw new Error('No pudimos confirmar la página del catálogo.');
  return {items:page.items.map((row:PublicProduct)=>({id:row.id,name:row.name,sku:row.sku,price:row.price,category:row.category,...(row.imageVersion?{imageVersion:row.imageVersion}:{}),...(row.apparel?{apparel:{audience:row.apparel.audience,sizes:[...row.apparel.sizes],color:row.apparel.color,colorHex:row.apparel.colorHex,material:row.apparel.material,description:row.apparel.description,garment:row.apparel.garment}}:{})})),nextCursor:page.nextCursor,currency:page.currency,...(page.categories?{categories:page.categories.map((category:PublicCategory)=>({id:category.id,name:category.name}))}:{})};
}
