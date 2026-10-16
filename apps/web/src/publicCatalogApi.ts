export type PublicProduct={id:string;name:string;sku:string;price:number;category:string};
export type PublicCatalog={items:PublicProduct[];nextCursor:string|null;currency:null};
const idPattern=/^[a-f0-9]{24}$/i;
export async function loadPublicCatalog(base:string,search:string,cursor:string,signal:AbortSignal):Promise<PublicCatalog>{
  const query=new URLSearchParams({search});if(cursor)query.set('cursor',cursor);
  const response=await fetch(base+'/demo-support/catalog?'+query,{signal,cache:'no-store'});
  if(!response.ok)throw new Error(response.status===404?'El catálogo solo está disponible en la demo.':response.status===429?'Espera un minuto antes de volver a consultar.':'No pudimos cargar el catálogo. Intenta de nuevo.');
  const body=await response.json(),page=body?.data;
  if(body?.ok!==true||!page||!Array.isArray(page.items)||page.items.length>12||page.currency!==null||!(page.nextCursor===null||typeof page.nextCursor==='string'&&idPattern.test(page.nextCursor)))throw new Error('No pudimos confirmar el catálogo.');
  const ids=new Set<string>();
  for(const row of page.items){
    if(!row||typeof row.id!=='string'||!idPattern.test(row.id)||ids.has(row.id)||!['name','sku','category'].every(key=>typeof row[key]==='string'&&row[key].trim().length>0&&row[key].length<=120)||typeof row.price!=='number'||!Number.isFinite(row.price)||row.price<0)throw new Error('No pudimos confirmar los productos.');
    ids.add(row.id);
  }
  if(page.nextCursor&&(page.items.length!==12||page.items.at(-1)?.id!==page.nextCursor))throw new Error('No pudimos confirmar la página del catálogo.');
  return {items:page.items.map((row:PublicProduct)=>({id:row.id,name:row.name,sku:row.sku,price:row.price,category:row.category})),nextCursor:page.nextCursor,currency:null};
}
