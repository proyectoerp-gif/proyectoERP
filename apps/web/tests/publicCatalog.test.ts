import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPublicCatalog} from '../src/publicCatalogApi';

const row={id:'111111111111111111111111',name:'Libreta',sku:'LIB-01',price:120.5,category:'Oficina'};
test('public catalog sends only literal search and cursor without staff credentials',async()=>{
  const previous=globalThis.fetch;
  try{
    globalThis.fetch=async(input,options)=>{const url=new URL(String(input));assert.equal(url.pathname,'/demo-support/catalog');assert.equal(url.searchParams.get('search'),'[x] & libreta');assert.equal(url.searchParams.get('cursor'),'222222222222222222222222');assert.equal(options?.headers,undefined);return Response.json({ok:true,data:{items:[{...row,companyId:'must-not-be-propagated'}],nextCursor:null,currency:null}});};
    const page=await loadPublicCatalog('https://example.test','[x] & libreta','222222222222222222222222',new AbortController().signal);
    assert.deepEqual(page.items,[row]);assert.equal(page.currency,null);
  }finally{globalThis.fetch=previous;}
});
test('public catalog rejects duplicates, invalid prices and unconfirmed pagination',async()=>{
  const previous=globalThis.fetch;
  try{
    for(const page of [{items:[row,row],nextCursor:null,currency:null},{items:[{...row,price:-1}],nextCursor:null,currency:null},{items:[row],nextCursor:row.id,currency:null},{items:[row],nextCursor:null,currency:'MXN'}]){
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
