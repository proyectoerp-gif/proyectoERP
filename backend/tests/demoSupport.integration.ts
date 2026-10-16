import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
vi.hoisted(()=>{process.env.JWT_SECRET='isolated-demo-test-secret-'.repeat(4);process.env.ERP_ENVIRONMENT='demo';});
import {createDemoSupportRoutes} from '../src/modules/demoSupport/routes.js';
import {demoScope} from '../src/modules/demoSupport/knowledge.js';
import {getDemoConversationModel} from '../src/modules/demoSupport/models.js';
import {getSupportTicketModel} from '../src/modules/serviceDesk/models/SupportTicket.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
import {getUserModel} from '../src/modules/usuarios/models/User.js';
import {signToken} from '../src/security/jwt.js';
import {env} from '../src/config/env.js';
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
});
afterAll(async()=>{
  await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());
  if(owned&&mongoose.connection.db?.databaseName===database&&database.startsWith('codex_demo_test_'))await mongoose.connection.dropDatabase();await mongoose.disconnect();
});
describe('Chat demo real con MongoDB',()=>{
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
  it('no expone ninguna ruta de la demo en producción',async()=>{
    env.ERP_ENVIRONMENT='production';try{expect((await call('/info')).status).toBe(404);expect((await call('/conversations','POST',{})).status).toBe(404);}finally{env.ERP_ENVIRONMENT='demo';}
  });
});
