import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import mongoose from 'mongoose';
import express from 'express';
import {randomUUID} from 'node:crypto';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
vi.hoisted(()=>{process.env.ERP_ENVIRONMENT='demo';process.env.CHATBOT_PROVIDER='guided';process.env.JWT_SECRET='isolated-shopping-test-'.repeat(4);});
import {createDemoSupportRoutes} from '../src/modules/demoSupport/routes.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getDemoConversationModel} from '../src/modules/demoSupport/models.js';
import {getGenerationAttemptModel} from '../src/modules/demoSupport/generationAttempts.js';
import {demoScope} from '../src/modules/demoSupport/knowledge.js';
import {fashionProducts} from '../src/scripts/fashionCatalogData.js';
import {env} from '../src/config/env.js';
const database='codex_shopping_'+randomUUID().replaceAll('-','');let owned=false,server:Server|undefined,base='';
beforeAll(async()=>{
  const uri=process.env.STOCK_TEST_MONGODB_URI;if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw Error('Explicit localhost replica required');
  await mongoose.connect(uri,{dbName:database});owned=mongoose.connection.db?.databaseName===database;if(!owned)throw Error('Unexpected database');
  await getProductModel().create([...fashionProducts.map(row=>({...row,companyId:demoScope.companyId,categoryId:'local-category'})),{companyId:demoScope.companyId,categoryId:'local-category',name:'Retired cheap',sku:'RETIRED',price:0,status:'INACTIVE'},{companyId:'foreign-company',categoryId:'local-category',name:'Private expensive',sku:'PRIVATE',price:99999}]);
  const app=express();app.use(express.json());app.use(createDemoSupportRoutes());app.use((e:any,_req:any,res:any,_next:any)=>res.status(e.statusCode??500).json({ok:false,error:{message:e.friendlyMessage}}));
  server=app.listen(0);await new Promise<void>(resolve=>server!.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
afterAll(async()=>{await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());if(owned&&mongoose.connection.db?.databaseName===database&&database.startsWith('codex_shopping_'))await mongoose.connection.dropDatabase();await mongoose.disconnect();});
async function visitor(){return (await(await fetch(base+'/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json()).data;}
async function ask(v:any,question:string,requestId=randomUUID()){
  const response=await fetch(base+'/conversations/'+v.id+'/messages',{method:'POST',headers:{Authorization:'Bearer '+v.token,'Content-Type':'application/json'},body:JSON.stringify({requestId,question})});
  expect(response.status).toBe(200);return (await response.json()).data;
}
it('quotes active demo products, persists context, handles retries once and does not consume AI',async()=>{
  const v=await visitor(),requestId=randomUUID(),question='Si compro 2 Camisa Lino y 1 Jeans Rectos cuánto me saldría';
  const first=await ask(v,question,requestId);expect(first.messages[0].answer).toContain('2,797.00');expect(first.messages[0].engine).toBe('guided');expect(first.aiRemaining).toBe(v.aiRemaining);
  const replay=await ask(v,question,requestId);expect(replay.messages).toHaveLength(1);
  expect((await getDemoConversationModel().findById(v.id))?.messages[0].catalogSelection).toHaveLength(2);
  await getProductModel().updateOne({companyId:demoScope.companyId,sku:'ALB-MOD-004'},{$set:{price:100}});
  const next=await ask(v,'y dos de cada una?');expect(next.messages[1].answer).toContain('2,198.00');expect(next.aiRemaining).toBe(v.aiRemaining);
  await getProductModel().updateOne({companyId:demoScope.companyId,sku:'ALB-MOD-004'},{$set:{price:899}});
  expect(await getGenerationAttemptModel().countDocuments({conversationId:v.id})).toBe(0);
});
it('compares the entire published catalog, scoped collections and ties, excluding retired and private rows',async()=>{
  const v=await visitor();const low=await ask(v,'Cuál es la prenda más barata de la tienda');expect(low.messages[0].answer).toContain('Gorra Algodón');expect(low.messages[0].answer).not.toContain('Retired');
  const high=await ask(v,'Cuál es la más cara');expect(high.messages[1].answer).toContain('Trench Ligero');expect(high.messages[1].answer).not.toContain('Private');
  const woman=await ask(v,'Cuál es la más barata de la colección Mujer');expect(woman.messages[2].answer).toContain('Top Textura');
});
it('asks for clarification before summing an unknown item and preserves privacy guards',async()=>{
  const v=await visitor();const unknown=await ask(v,'Total por Camisa Lino y un sombrero');expect(unknown.messages[0].answer).not.toContain('Total estimado:');expect(unknown.messages[0].answer).toContain('sombrero');
  const privateQuestion=await ask(v,'Mi password: SecretValue123, cuánto por Camisa Lino');expect(privateQuestion.messages[1].needsHuman).toBe(true);expect(privateQuestion.messages[1].answer).not.toContain('Total estimado:');
  expect(privateQuestion.aiRemaining).toBe(v.aiRemaining);
});
it('bypasses an enabled AI provider for live prices and comparisons',async()=>{
  const original={...env},nativeFetch=fetch,provider=vi.fn(async()=>new Response(JSON.stringify({status:'completed',output:[]})));
  Object.assign(env,{CHATBOT_PROVIDER:'openai',OPENAI_API_KEY:'local-placeholder-only',OPENAI_MODEL:'local-test'});
  vi.stubGlobal('fetch',(input:any,init:any)=>String(input).startsWith('https://api.openai.com/')?provider():nativeFetch(input,init));
  try {
    const v=await visitor();const result=await ask(v,'Total por 2 Camisa Lino y 1 Jeans Rectos');
    expect(result.messages[0].answer).toContain('2,797.00');expect(result.aiRemaining).toBe(v.aiRemaining);expect(provider).not.toHaveBeenCalled();
  } finally {vi.unstubAllGlobals();Object.assign(env,original);}
});
