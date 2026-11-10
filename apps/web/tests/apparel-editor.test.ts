import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseApparel,saveApparel,type Apparel} from '../src/apparelApi';
const apparel:Apparel={audience:'Unisex',sizes:['S','M'],color:'Azul',colorHex:'#203060',material:'Algodón',description:'Camiseta de corte recto.',garment:'tee'};
test('apparel writes send the original snapshot, normalize text and reject a mismatched response',async t=>{
  const fetch=globalThis.fetch;t.after(()=>{globalThis.fetch=fetch;});const id='a'.repeat(24),signal=new AbortController().signal;
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://test/products/'+id+'/apparel');assert.equal(options?.method,'PATCH');assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer token');
    assert.deepEqual(JSON.parse(String(options?.body)),{apparel,expected:apparel});
    return new Response(JSON.stringify({data:{id,apparel}}));
  };
  await saveApparel('https://test','token',id,{...apparel,color:' Azul '},apparel,signal);
  globalThis.fetch=async()=>new Response(JSON.stringify({data:{id:'b'.repeat(24),apparel}}));
  await assert.rejects(saveApparel('https://test','token',id,apparel,null,signal),/confirmar/);
  globalThis.fetch=async()=>new Response('',{status:409});
  await assert.rejects(saveApparel('https://test','token',id,apparel,null,signal),(e:any)=>e.status===409);
});
test('invalid apparel never causes a write and parser rejects missing, duplicated or unsafe values',async t=>{
  const fetch=globalThis.fetch;t.after(()=>{globalThis.fetch=fetch;});globalThis.fetch=async()=>{throw new Error('Should not request');};
  for(const value of [null,{}, {...apparel,sizes:[]},{...apparel,sizes:['M','M']},{...apparel,colorHex:'red'},{...apparel,garment:'__proto__'},{...apparel,description:'corta'}])assert.throws(()=>parseApparel(value));
  await assert.rejects(saveApparel('https://test','token','a'.repeat(24),{...apparel,sizes:[]},null,new AbortController().signal),/válida/);
});
