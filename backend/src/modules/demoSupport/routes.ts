import {Router, type Request} from 'express';
import mongoose from 'mongoose';
import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {env} from '../../config/env.js';
import {AppError} from '../../errors/AppError.js';
import {authenticate} from '../../middleware/authenticate.js';
import {authorize} from '../../middleware/authorize.js';
import {tenant} from '../../middleware/tenant.js';
import {getSupportTicketModel} from '../serviceDesk/models/SupportTicket.js';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {getDemoConversationModel} from './models.js';
import {answerDemoQuestion,demoArticles,demoBusiness,demoScope} from './knowledge.js';
import {publicDemoCatalog} from './catalog.js';

const fail=(statusCode:number,message:string)=>new AppError({code:statusCode===404?'NOT_FOUND':statusCode===429?'RATE_LIMITED':statusCode===409?'CONFLICT':'VALIDATION_ERROR',statusCode,message,friendlyMessage:message});
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const bodySchema=z.object({requestId:z.string().uuid(),question:z.string().trim().min(3).max(500)}).strict();
const buckets=new Map<string,{count:number,reset:number}>();
function publicConversation(row:any){return {id:String(row._id),messages:row.messages,ticketId:row.ticketId??null,expiresAt:row.expiresAt};}
function ownership(req:Request){
  const token=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token||!/^[a-f0-9]{24}$/i.test(String(req.params.id)))throw fail(404,'Conversación no disponible.');
  return {...demoScope,_id:String(req.params.id),accessHash:hash(token),expiresAt:{$gt:new Date()}};
}
export function createDemoSupportRoutes(){
  const router=Router();
  router.use((_req,_res,next)=>{if(env.ERP_ENVIRONMENT!=='demo')return next(fail(404,'Demo de atención no disponible.'));next();});
  router.get('/info',(_req,res)=>res.json({ok:true,data:{business:demoBusiness,articles:demoArticles.map(({keywords,...article})=>article)}}));
  router.get('/conversations',authenticate,tenant,authorize('soporte.ver'),async(req,res,next)=>{try{
    if(req.tenant?.companyId!==demoScope.companyId||req.tenant?.branchId!==demoScope.branchId)throw fail(404,'Demo de atención no disponible.');
    const rows=await getDemoConversationModel().find({...demoScope,expiresAt:{$gt:new Date()}}).sort({_id:-1}).limit(30).lean().exec();
    res.json({ok:true,data:rows.map(publicConversation)});
  }catch(e){next(e);}});
  router.use((req,res,next)=>{
    const now=Date.now();for(const [key,value] of buckets)if(value.reset<=now)buckets.delete(key);
    const key=req.ip??'unknown',bucket=buckets.get(key)??{count:0,reset:now+60_000};
    if(buckets.size>=5000&&!buckets.has(key)){res.set('Retry-After','60');return next(fail(429,'Demo ocupada. Intenta más tarde.'));}
    buckets.set(key,bucket);bucket.count++;
    if(bucket.count>30){res.set('Retry-After','60');return next(fail(429,'Espera un minuto antes de continuar.'));}next();
  });
  router.get('/catalog',async(req,res,next)=>{try{
    res.set('Cache-Control','no-store').json({ok:true,data:await publicDemoCatalog(req.query)});
  }catch(e){next(e);}});
  router.post('/conversations',async(req,res,next)=>{try{
    if(!z.object({}).strict().safeParse(req.body).success)throw fail(400,'No envíes datos personales al iniciar.');
    await getDemoConversationModel().init();
    const token=randomBytes(32).toString('hex');
    const row=await getDemoConversationModel().create({...demoScope,accessHash:hash(token),expiresAt:new Date(Date.now()+7*86400_000)});
    res.status(201).json({ok:true,data:{...publicConversation(row),token}});
  }catch(e){next(e);}});
  router.post('/conversations/:id/messages',async(req,res,next)=>{try{
    const parsed=bodySchema.safeParse(req.body);if(!parsed.success)throw fail(400,'Escribe una pregunta de 3 a 500 caracteres.');
    const filter=ownership(req),Model=getDemoConversationModel();
    const row=await Model.findOne(filter).lean().exec();if(!row)throw fail(404,'Conversación no disponible.');
    const previous=row.messages.find((m:any)=>m.requestId===parsed.data.requestId);
    if(previous){if(previous.question!==parsed.data.question)throw fail(409,'La pregunta pendiente cambió.');return res.json({ok:true,data:publicConversation(row)});}
    if(row.ticketId)throw fail(409,'El caso ya se envió al equipo. Inicia otra conversación para una consulta nueva.');
    if(row.messages.length>=20)throw fail(429,'Esta conversación llegó a 20 preguntas. Inicia otra o solicita ayuda.');
    const answer=answerDemoQuestion(parsed.data.question);
    const updated=await Model.findOneAndUpdate({...filter,__v:row.__v},{$push:{messages:{...parsed.data,answer:answer.text,source:answer.source,needsHuman:answer.needsHuman}},$inc:{__v:1}},{new:true}).lean().exec();
    if(!updated)throw fail(409,'La conversación cambió. Reintenta la misma pregunta.');
    res.json({ok:true,data:publicConversation(updated)});
  }catch(e){next(e);}});
  router.post('/conversations/:id/handoff',async(req,res,next)=>{try{
    if(!z.object({}).strict().safeParse(req.body).success)throw fail(400,'Solicitud no válida.');
    const filter=ownership(req),Model=getDemoConversationModel();
    await Promise.all([Model.init(),getSupportTicketModel().init(),getAuditEventModel().init()]);
    const session=await mongoose.startSession();let result:any;
    try{await session.withTransaction(async()=>{
      const row=await Model.findOne(filter).session(session).exec();if(!row)throw fail(404,'Conversación no disponible.');
      if(row.ticketId){result=publicConversation(row);return;}
      if(!row.messages.length)throw fail(400,'Escribe primero una pregunta para dar contexto al equipo.');
      const last=row.messages[row.messages.length-1];
      const [ticket]=await getSupportTicketModel().create([{...demoScope,subject:'Chat demo: '+last.question.slice(0,100),description:('Caso ficticio del chat. Conversación: '+String(row._id)+'\nÚltima pregunta: '+last.question+'\nConsulta el historial en Atención demo.').slice(0,1000),targetDate:new Date().toISOString().slice(0,10),priority:'medium',status:'open'}],{session});
      row.ticketId=String(ticket._id);await row.save({session});
      await getAuditEventModel().create([{...demoScope,userId:'demo-chat-visitor',action:'CREATE',module:'soporte',entityId:row.ticketId,details:{source:'demo-chat',conversationId:String(row._id)}}],{session});
      result=publicConversation(row);
    });}finally{await session.endSession();}
    res.json({ok:true,data:result});
  }catch(e){next(e);}});
  return router;
}
