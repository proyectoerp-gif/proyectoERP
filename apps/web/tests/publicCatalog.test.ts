import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPublicCatalog} from '../src/publicCatalogApi';

const row={id:'111111111111111111111111',name:'Libreta',sku:'LIB-01',price:120.5,category:'Oficina'};
test('public catalog sends only literal search and cursor without staff credentials',async()=>{
  const previous=globalThis.fetch;
  try{
    globalThis.fetch=async(input,options)=>{const url=new URL(String(input));assert.equal(url.pathname,'/demo-support/catalog');assert.equal(url.searchParams.get('search'),'[x] & libreta');assert.equal(url.searchParams.get('cursor'),'222222222222222222222222');assert.equal(options?.headers,undefined);return Response.json({ok:true,data:{items:[{...row,companyId:'must-not-be-propagated'}],nextCursor:null,currency:'MXN'}});};
    const page=await loadPublicCatalog('https://example.test','[x] & libreta','222222222222222222222222',new AbortController().signal);
    assert.deepEqual(page.items,[row]);assert.equal(page.currency,'MXN');
  }finally{globalThis.fetch=previous;}
});
test('public catalog rejects duplicates, invalid prices and unconfirmed pagination',async()=>{
  const previous=globalThis.fetch;
  try{
    for(const page of [{items:[row,row],nextCursor:null,currency:null},{items:[{...row,price:-1}],nextCursor:null,currency:null},{items:[row],nextCursor:row.id,currency:null},{items:[row],nextCursor:null,currency:'USD'}]){
      globalThis.fetch=async()=>Response.json({ok:true,data:page});
      await assert.rejects(()=>loadPublicCatalog('https://example.test','','',new AbortController().signal));
    }
  }finally{globalThis.fetch=previous;}
});
test('public catalog preserves unavailable and throttled states instead of substituting products',async()=>{
  const previous=globalThis.fetch;
  try{
    for(const [status,message] of [[404,/solo está disponible/],[429,/Espera un minuto/],[503,/No pudimos cargar/]] as const){globalThis.fetch=async()=>new Response('',{status});await assert.rejects(()=>loadPublicCatalog('https://example.test','','',new AbortController().signal),message);}
  }finally{globalThis.fetch=previous;}
});
test('public catalog applies category and price filters to every requested page and bounds category metadata',async()=>{
  const previous=globalThis.fetch;
  const category={id:'333333333333333333333333',name:'Oficina'};
  try{
    globalThis.fetch=async input=>{
      const url=new URL(String(input));
      assert.equal(url.searchParams.get('category'),category.id);
      assert.equal(url.searchParams.get('minPrice'),'100');
      assert.equal(url.searchParams.get('maxPrice'),'250');
      return Response.json({ok:true,data:{items:[row],nextCursor:null,currency:'MXN',categories:[{...category,companyId:'private'}]}});
    };
    const page=await loadPublicCatalog('https://example.test','','',new AbortController().signal,{category:category.id,minPrice:'100',maxPrice:'250'});
    assert.deepEqual(page.categories,[category]);
    globalThis.fetch=async()=>Response.json({ok:true,data:{items:[],nextCursor:null,currency:'MXN',categories:[category,category]}});
    await assert.rejects(()=>loadPublicCatalog('https://example.test','','',new AbortController().signal));
  }finally{globalThis.fetch=previous;}
});

test('fashion filters preserve validated public attributes and reject malformed garment data',async()=>{
 const previous=globalThis.fetch;
 const apparel={audience:'Unisex',sizes:['S','M'],color:'Marfil',colorHex:'#e9e2d4',material:'Algodón',description:'Diseño ficticio de camiseta.',garment:'tee'};
 try{
  globalThis.fetch=async input=>{const url=new URL(String(input));for(const [key,value]of Object.entries({audience:'Unisex',size:'M',color:'Marfil',sort:'price-asc',ids:row.id}))assert.equal(url.searchParams.get(key),value);return Response.json({ok:true,data:{items:[{...row,apparel:{...apparel,privateNote:'never propagate'}}],nextCursor:null,currency:'MXN'}});};
  const page=await loadPublicCatalog('https://example.test','','',new AbortController().signal,{audience:'Unisex',size:'M',color:'Marfil',sort:'price-asc',ids:row.id});
  assert.deepEqual(page.items[0].apparel,apparel);
  for(const invalid of [{...apparel,sizes:['INVALID']},{...apparel,colorHex:'url(secret)'},{...apparel,garment:'unknown'}]){
   globalThis.fetch=async()=>Response.json({ok:true,data:{items:[{...row,apparel:invalid}],nextCursor:null,currency:'MXN'}});
   await assert.rejects(()=>loadPublicCatalog('https://example.test','','',new AbortController().signal));
  }
 }finally{globalThis.fetch=previous;}
});

test('price pagination verifies the boundary ID, price and selected order',async()=>{
 const previous=globalThis.fetch;
 const items=Array.from({length:12},(_,i)=>({...row,id:(i+1).toString(16).padStart(24,'0'),price:100+i}));const last=items.at(-1)!;
 try{
  for(const [boundary,valid]of [[{id:last.id,price:last.price,sort:'price-asc'},true],[{id:last.id,price:999,sort:'price-asc'},false],[{id:last.id,price:last.price,sort:'price-desc'},false]]as const){
   const cursor=Buffer.from(JSON.stringify(boundary)).toString('base64url');globalThis.fetch=async()=>Response.json({ok:true,data:{items,nextCursor:cursor,currency:'MXN'}});
   const action=()=>loadPublicCatalog('https://example.test','','',new AbortController().signal,{sort:'price-asc'});
   if(valid)assert.equal((await action()).nextCursor,cursor);else await assert.rejects(action);
  }
 }finally{globalThis.fetch=previous;}
});
