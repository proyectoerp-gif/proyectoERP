import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
vi.hoisted(()=>{process.env.JWT_SECRET='isolated-demo-test-secret-'.repeat(4);process.env.ERP_ENVIRONMENT='demo';process.env.CHATBOT_PROVIDER='guided';process.env.OPENAI_API_KEY='';process.env.OPENAI_MODEL='';});
import {createDemoSupportRoutes} from '../src/modules/demoSupport/routes.js';
import {demoScope} from '../src/modules/demoSupport/knowledge.js';
import {getDemoConversationModel} from '../src/modules/demoSupport/models.js';
import {getSupportTicketModel} from '../src/modules/serviceDesk/models/SupportTicket.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
import {getUserModel} from '../src/modules/usuarios/models/User.js';
import {signToken} from '../src/security/jwt.js';
import {env} from '../src/config/env.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getCategoryModel} from '../src/modules/productos/models/Category.js';
import {answerWithBudget,getGenerationAttemptModel,getGenerationBudgetModel} from '../src/modules/demoSupport/generationAttempts.js';
const database='codex_demo_test_'+randomUUID().replaceAll('-','');
let owned=false,server:Server|undefined,base='',visitor:any,other:any;
const staff:Record<string,string>={};
async function call(path:string,method='GET',body?:unknown,token?:string){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
beforeAll(async()=>{
  const uri=process.env.STOCK_TEST_MONGODB_URI;
  if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw new Error('Explicit localhost replica set required');
  await mongoose.connect(uri,{dbName:database});if(mongoose.connection.db?.databaseName!==database)throw new Error('Unexpected database');owned=true;
  const app=express();app.use(express.json());app.use(createDemoSupportRoutes());app.use((e:any,_req:any,res:any,_next:any)=>res.status(e.statusCode??500).json({ok:false,error:{message:e.friendlyMessage??'Internal'}}));
  server=app.listen(0);await new Promise<void>(resolve=>server!.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
  await Promise.all([getDemoConversationModel().init(),getSupportTicketModel().init(),getAuditEventModel().init(),getUserModel().init()]);
  for(const [name,scope,permissions] of [['agent',demoScope,['soporte.ver']],['denied',demoScope,['dashboard.ver']],['foreign',{companyId:'foreign-company',branchId:'foreign-branch'},['soporte.ver']]] as const){
    const user=await getUserModel().create({...scope,name,email:name+'@example.test',passwordHash:'unused-test-hash',roleId:'test-role',permissions:[...permissions]});
    staff[name]=signToken({sub:String(user._id),...scope,sessionVersion:0});
  }
  const category=await getCategoryModel().create({companyId:demoScope.companyId,name:'Oficina',code:'OFI'});
  await getProductModel().create([
    ...Array.from({length:13},(_,i)=>({companyId:demoScope.companyId,categoryId:String(category._id),name:i===0?'Libreta [x]':'Artículo '+i,sku:'PUBLIC-'+i,price:100+i})),
    {companyId:demoScope.companyId,categoryId:String(category._id),name:'Producto oculto',sku:'HIDDEN',price:42,status:'INACTIVE'},
    {companyId:'foreign-company',categoryId:String(category._id),name:'Producto privado',sku:'FOREIGN',price:999}
  ]);
});
afterAll(async()=>{
  await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());
  if(owned&&mongoose.connection.db?.databaseName===database&&database.startsWith('codex_demo_test_'))await mongoose.connection.dropDatabase();await mongoose.disconnect();
});
describe('Generative limits and retry persistence with a simulated provider',()=>{
  it('persists the provider label and verified sources through the visitor HTTP route',async()=>{
    const original={...env},nativeFetch=fetch;const provider=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({answer:'El sábado ficticio abre de 9:00 a 14:00.',sourceIds:['horario'],needsHuman:false})}]}]})));
    Object.assign(env,{CHATBOT_PROVIDER:'openai',OPENAI_API_KEY:'isolated-test-placeholder',OPENAI_MODEL:'test-model',CHATBOT_DAILY_LIMIT:10});
    vi.stubGlobal('fetch',(input:any,init:any)=>String(input)==='https://api.openai.com/v1/responses'?provider(input,init):nativeFetch(input,init));
    try{const visitor=(await(await call('/conversations','POST',{})).json()).data;const result=await(await call('/conversations/'+visitor.id+'/messages','POST',{requestId:randomUUID(),question:'¿Atienden los sábados?'},visitor.token)).json();expect(result.data.messages[0]).toMatchObject({engine:'openai',source:{id:'horario'},sources:[{id:'horario'}]});expect(JSON.stringify(result)).not.toContain('isolated-test-placeholder');expect(provider).toHaveBeenCalledTimes(1);const guided=await(await call('/conversations/'+visitor.id+'/messages','POST',{requestId:randomUUID(),question:'¿Cuál es su horario?',articleId:'horario'},visitor.token)).json();expect(guided.data.messages[1].engine).toBe('guided');expect(guided.data.aiRemaining).toBe(2);expect(provider).toHaveBeenCalledTimes(1);await getGenerationBudgetModel().deleteMany({});}finally{vi.unstubAllGlobals();Object.assign(env,original);}
  });
  it('shares a durable daily ceiling and reuses an answer without another charge',async()=>{
    const original={...env};const fetcher=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({answer:'Abre el sábado de 9:00 a 14:00 en la simulación.',sourceIds:['horario'],needsHuman:false})}]}]})));
    Object.assign(env,{CHATBOT_PROVIDER:'openai',OPENAI_API_KEY:'isolated-test-placeholder',OPENAI_MODEL:'test-model',CHATBOT_DAILY_LIMIT:1});vi.stubGlobal('fetch',fetcher);
    try{
      const conversationId=new mongoose.Types.ObjectId().toString(),requestId=randomUUID();
      expect((await answerWithBudget(conversationId,requestId,'¿Abren el sábado?')).engine).toBe('openai');
      expect((await answerWithBudget(conversationId,requestId,'¿Abren el sábado?')).engine).toBe('openai');
      expect((await answerWithBudget(conversationId,randomUUID(),'Horario')).engine).toBe('fallback');
      expect(fetcher).toHaveBeenCalledTimes(1);expect((await getGenerationBudgetModel().findOne().lean())?.count).toBe(1);
      await expect(answerWithBudget(conversationId,requestId,'Pregunta alterada')).rejects.toMatchObject({statusCode:409});
    }finally{vi.unstubAllGlobals();Object.assign(env,original);}
  });
  it('does not duplicate concurrent attempts and recovers an abandoned one without a provider call',async()=>{
    const original={...env};const fetcher=vi.fn().mockResolvedValue(new Response('{}',{status:503}));
    Object.assign(env,{CHATBOT_PROVIDER:'openai',OPENAI_API_KEY:'isolated-test-placeholder',OPENAI_MODEL:'test-model',CHATBOT_DAILY_LIMIT:10});vi.stubGlobal('fetch',fetcher);
    try{
      const conversationId=new mongoose.Types.ObjectId().toString(),requestId=randomUUID();
      const results=await Promise.allSettled([answerWithBudget(conversationId,requestId,'Horario'),answerWithBudget(conversationId,requestId,'Horario')]);
      expect(results.some(r=>r.status==='fulfilled')).toBe(true);expect(fetcher).toHaveBeenCalledTimes(1);
      expect((await answerWithBudget(conversationId,requestId,'Horario')).engine).toBe('fallback');
      const stale=randomUUID();await getGenerationAttemptModel().create({conversationId,requestId:stale,fingerprint:(await import('node:crypto')).createHash('sha256').update('Horario').digest('hex'),expiresAt:new Date(Date.now()+7*86400_000-61_000)});
      expect((await answerWithBudget(conversationId,stale,'Horario')).engine).toBe('fallback');expect(fetcher).toHaveBeenCalledTimes(1);
    }finally{vi.unstubAllGlobals();Object.assign(env,original);}
  });
});
describe('Hybrid quota isolation',()=>{
  it('atomically enforces conversation and connection limits without spending another quota on denials',async()=>{
    const original={...env};const provider=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({answer:'El horario ficticio del sábado es de 9:00 a 14:00.',sourceIds:['horario'],needsHuman:false})}]}}]})));
    Object.assign(env,{CHATBOT_PROVIDER:'gemini',GEMINI_API_KEY:'isolated-test-placeholder',CHATBOT_DAILY_LIMIT:25,CHATBOT_CONVERSATION_LIMIT:2,CHATBOT_VISITOR_DAILY_LIMIT:2,CHATBOT_MINUTE_LIMIT:30});vi.stubGlobal('fetch',provider);
    try{
      await getGenerationBudgetModel().deleteMany({});const first=new mongoose.Types.ObjectId().toString(),second=new mongoose.Types.ObjectId().toString();
      const results=await Promise.all(Array.from({length:4},()=>answerWithBudget(first,randomUUID(),'¿Atienden en sábado?','same-connection')));
      expect(results.filter(answer=>answer.engine==='gemini')).toHaveLength(2);expect(results.filter(answer=>answer.limitReason==='conversation')).toHaveLength(2);expect(provider).toHaveBeenCalledTimes(2);
      expect((await answerWithBudget(second,randomUUID(),'¿Atienden en sábado?','same-connection')).limitReason).toBe('visitor');
      expect((await getGenerationBudgetModel().findOne({day:new Date().toISOString().slice(0,10)}).lean())?.count).toBe(2);
      expect((await answerWithBudget(second,randomUUID(),'¿Atienden en sábado?','other-connection')).engine).toBe('gemini');
    }finally{vi.unstubAllGlobals();Object.assign(env,original);}
  });
  it('keeps the shared daily ceiling under competing conversations',async()=>{
    const original={...env};const provider=vi.fn().mockImplementation(async()=>new Response('{}',{status:503}));
    Object.assign(env,{CHATBOT_PROVIDER:'gemini',GEMINI_API_KEY:'isolated-test-placeholder',CHATBOT_DAILY_LIMIT:1,CHATBOT_MINUTE_LIMIT:30});vi.stubGlobal('fetch',provider);
    try{await getGenerationBudgetModel().deleteMany({});const results=await Promise.all(Array.from({length:4},()=>answerWithBudget(new mongoose.Types.ObjectId().toString(),randomUUID(),'Horario',randomUUID())));expect(provider).toHaveBeenCalledTimes(1);expect(results.filter(a=>a.limitReason==='daily')).toHaveLength(3);}finally{vi.unstubAllGlobals();Object.assign(env,original);}
  });
});

describe('Chat demo real con MongoDB',()=>{
  it('publica únicamente campos del catálogo activo de la empresa demo, con paginación limitada',async()=>{
    const first=await call('/catalog');expect(first.status).toBe(200);const {data}=await first.json();
    expect(data.items).toHaveLength(12);expect(data.currency).toBeNull();expect(data.nextCursor).toBe(data.items[11].id);
    for(const row of data.items){expect(Object.keys(row).sort()).toEqual(['category','id','name','price','sku']);expect(row.category).toBe('Oficina');expect(row.sku).toMatch(/^PUBLIC-/);}
    const last=await(await call('/catalog?cursor='+data.nextCursor)).json();expect(last.data.items).toHaveLength(1);expect(last.data.nextCursor).toBeNull();expect(data.items.some((row:any)=>row.id===last.data.items[0].id)).toBe(false);
  });
  it('busca texto literal y no permite cambiar empresa, estado ni tamaño desde la ruta pública',async()=>{
    const {data}=await(await call('/catalog?search='+encodeURIComponent('[x]'))).json();expect(data.items).toHaveLength(1);expect(data.items[0].name).toBe('Libreta [x]');
    for(const query of ['companyId=foreign-company','status=INACTIVE','limit=999'])expect((await call('/catalog?'+query)).status).toBe(400);
  });
  it('publica solo las 20 políticas ficticias',async()=>{const response=await call('/info');expect(response.status).toBe(200);const {data}=await response.json();expect(data.business.mode).toBe('guided_faq');expect(data.articles).toHaveLength(20);});
  it('rechaza empresa o campos inyectados por el visitante',async()=>{expect((await call('/conversations','POST',{companyId:'foreign'})).status).toBe(400);});
  it('crea sesiones con secreto opaco y almacena únicamente su hash',async()=>{
    visitor=(await (await call('/conversations','POST',{})).json()).data;other=(await (await call('/conversations','POST',{})).json()).data;
    expect(visitor.token).toMatch(/^[a-f0-9]{64}$/);expect(visitor.accessHash).toBeUndefined();const stored=await getDemoConversationModel().findById(visitor.id).select('+accessHash').lean();expect(stored!.accessHash).not.toBe(visitor.token);expect(stored!.companyId).toBe(demoScope.companyId);
  });
  it('no acepta otra sesión ni un token del personal como visitante',async()=>{
    for(const token of [undefined,other.token,staff.agent])expect((await call('/conversations/'+visitor.id+'/messages','POST',{requestId:randomUUID(),question:'Horario'},token)).status).toBe(404);
  });
  it('guarda una respuesta con fuente y repite sin duplicar mensajes',async()=>{
    const body={requestId:randomUUID(),question:'¿Cuál es su horario?'};
    for(let i=0;i<2;i++){const response=await call('/conversations/'+visitor.id+'/messages','POST',body,visitor.token);expect(response.status).toBe(200);const {data}=await response.json();expect(data.messages).toHaveLength(1);expect(data.messages[0].source.id).toBe('horario');expect(data.token).toBeUndefined();}
    expect((await call('/conversations/'+visitor.id+'/messages','POST',{...body,question:'otra pregunta'},visitor.token)).status).toBe(409);
  });
  it('conserva la incertidumbre cuando no existe una fuente',async()=>{const response=await call('/conversations/'+visitor.id+'/messages','POST',{requestId:randomUUID(),question:'¿Venden naves espaciales?'},visitor.token);const {data}=await response.json();expect(data.messages[1]).toMatchObject({source:null,needsHuman:true});});
  it('crea un solo ticket y auditoría ante dos derivaciones simultáneas',async()=>{
    const responses=await Promise.all([call('/conversations/'+visitor.id+'/handoff','POST',{},visitor.token),call('/conversations/'+visitor.id+'/handoff','POST',{},visitor.token)]);
    const bodies=await Promise.all(responses.map(r=>r.json()));expect(responses.map(r=>r.status)).toEqual([200,200]);expect(bodies[0].data.ticketId).toBe(bodies[1].data.ticketId);
    expect(await getSupportTicketModel().countDocuments()).toBe(1);expect(await getAuditEventModel().countDocuments()).toBe(1);expect((await getSupportTicketModel().findOne().lean())!.companyId).toBe(demoScope.companyId);
  });
  it('bloquea cambios en la conversación ya derivada',async()=>{expect((await call('/conversations/'+visitor.id+'/messages','POST',{requestId:randomUUID(),question:'Otra pregunta'},visitor.token)).status).toBe(409);});
  it('protege el historial por permiso y empresa y no revela credenciales',async()=>{
    expect((await call('/conversations')).status).toBe(401);expect((await call('/conversations','GET',undefined,staff.denied)).status).toBe(403);expect((await call('/conversations','GET',undefined,staff.foreign)).status).toBe(404);
    const response=await call('/conversations','GET',undefined,staff.agent);expect(response.status).toBe(200);const body=await response.text();expect(body).not.toContain(visitor.token);expect(body).not.toContain('accessHash');expect(body).toContain(visitor.id);
  });
  it('rechaza sesiones caducadas aunque el TTL aún no las haya eliminado',async()=>{
    await getDemoConversationModel().updateOne({_id:other.id},{$set:{expiresAt:new Date(0)}});expect((await call('/conversations/'+other.id+'/handoff','POST',{},other.token)).status).toBe(404);
  });
  it('consulta el precio real del catálogo seleccionado y conserva el contexto al derivar',async()=>{
    const product=await getProductModel().findOne({companyId:demoScope.companyId,sku:'PUBLIC-0'}).lean();
    const session=(await(await call('/conversations','POST',{})).json()).data;
    const payload={requestId:randomUUID(),question:'¿Cuál es el precio de este producto?',productId:String(product!._id)};
    const response=await call('/conversations/'+session.id+'/messages','POST',payload,session.token);expect(response.status).toBe(200);const message=(await response.json()).data.messages[0];expect(message.answer).toContain('100.00');expect(message.source.id).toBe('catalog-'+String(product!._id));expect(message.productName).toBe('Libreta [x]');
    const handoff=await call('/conversations/'+session.id+'/handoff','POST',{},session.token);expect(handoff.status).toBe(200);const ticket=await getSupportTicketModel().findById((await handoff.json()).data.ticketId);expect(ticket!.description).toContain('Libreta [x]');
  });
  it('no revela productos retirados ni de otra empresa a través del chat',async()=>{
    const session=(await(await call('/conversations','POST',{})).json()).data;
    const products=await getProductModel().find({sku:{$in:['HIDDEN','FOREIGN']}}).lean();
    for(const product of products){const response=await call('/conversations/'+session.id+'/messages','POST',{requestId:randomUUID(),question:'Precio del producto',productId:String(product._id)},session.token);expect(response.status).toBe(200);const message=(await response.json()).data.messages.at(-1);expect(message.source).toBeNull();expect(message.answer).not.toContain(product.name);expect(message.needsHuman).toBe(true);}
  });
  it('no expone ninguna ruta de la demo en producción',async()=>{
    env.ERP_ENVIRONMENT='production';try{expect((await call('/info')).status).toBe(404);expect((await call('/catalog')).status).toBe(404);expect((await call('/conversations','POST',{})).status).toBe(404);}finally{env.ERP_ENVIRONMENT='demo';}
  });
});
