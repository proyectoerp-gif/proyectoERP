import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changeCatalogState} from '../src/catalogLifecycleApi';
test('catalog removal sends only the expected identity/state and verifies the confirmation',async()=>{
 const original=globalThis.fetch,id='a'.repeat(24),entry={id,name:'Producto ficticio',status:'ACTIVE'};let calls=0;
 try{
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'/api/products/'+id+'/status');assert.equal(options?.method,'PATCH');assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer local');assert.deepEqual(JSON.parse(String(options?.body)),{expectedStatus:'ACTIVE',status:'INACTIVE',expectedName:entry.name});return new Response(JSON.stringify({data:{id,name:entry.name,status:'INACTIVE'}}));};
  await changeCatalogState('/api','local','products',entry);assert.equal(calls,1);
  await assert.rejects(()=>changeCatalogState('/api','local','products',{...entry,id:'bad'}));assert.equal(calls,1);
  globalThis.fetch=async()=>new Response(JSON.stringify({data:{id:'b'.repeat(24),name:entry.name,status:'INACTIVE'}}));
  await assert.rejects(()=>changeCatalogState('/api','local','products',entry),/No se pudo confirmar/);
 }finally{globalThis.fetch=original;}
});
test('restore requires an inactive record and verifies the returned status',async()=>{
 const original=globalThis.fetch,id='c'.repeat(24);
 try{
  globalThis.fetch=async(_url,options)=>{assert.deepEqual(JSON.parse(String(options?.body)),{expectedStatus:'INACTIVE',status:'ACTIVE',expectedName:'Cliente'});return new Response(JSON.stringify({data:{id,name:'Cliente',status:'ACTIVE'}}));};
  await changeCatalogState('/api','local','customers',{id,name:'Cliente',status:'INACTIVE'});
  globalThis.fetch=async()=>new Response(JSON.stringify({data:{id,name:'Cliente',status:'INACTIVE'}}));
  await assert.rejects(()=>changeCatalogState('/api','local','customers',{id,name:'Cliente',status:'INACTIVE'}));
 }finally{globalThis.fetch=original;}
});
