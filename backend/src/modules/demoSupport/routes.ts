import {getProductModel} from '../productos/models/Product.js';
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
import {chatbotBusiness,type ChatAnswer} from './generative.js';
import {answerWithBudget,visitorQuotaKey,remainingConversationAI} from './generationAttempts.js';

const fail=(statusCode:number,message:string)=>new AppError({code:statusCode===404?'NOT_FOUND':statusCode===429?'RATE_LIMITED':statusCode===409?'CONFLICT':'VALIDATION_ERROR',statusCode,message,friendlyMessage:message});
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const bodySchema=z.object({requestId:z.string().uuid(),question:z.string().trim().min(3).max(500),productId:z.string().regex(/^[a-f0-9]{24}$/i).transform(v=>v.toLowerCase()).optional(),articleId:z.string().max(40).optional()}).strict();
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
  router.get('/info',(_req,res)=>res.set('Cache-Control','no-store').json({ok:true,data:{business:chatbotBusiness(demoBusiness),articles:demoArticles.map(({keywords,...article})=>article)}}));
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
    res.status(201).json({ok:true,data:{...publicConversation(row),token,aiRemaining:env.CHATBOT_CONVERSATION_LIMIT}});
  }catch(e){next(e);}});
  router.post('/conversations/:id/messages',async(req,res,next)=>{try{
    const parsed=bodySchema.safeParse(req.body);if(!parsed.success)throw fail(400,'Escribe una pregunta de 3 a 500 caracteres.');
    const filter=ownership(req),Model=getDemoConversationModel();
    const row=await Model.findOne(filter).lean().exec();if(!row)throw fail(404,'Conversación no disponible.');
    const previous=row.messages.find((m:any)=>m.requestId===parsed.data.requestId);
    if(previous){if(previous.question!==parsed.data.question||previous.productId!==parsed.data.productId||previous.articleId!==parsed.data.articleId)throw fail(409,'La pregunta pendiente cambió.');return res.json({ok:true,data:{...publicConversation(row),aiRemaining:await remainingConversationAI(String(row._id))}});}
    if(row.ticketId)throw fail(409,'El caso ya se envió al equipo. Inicia otra conversación para una consulta nueva.');
    if(row.messages.length>=20)throw fail(429,'Esta conversación llegó a 20 preguntas. Inicia otra o solicita ayuda.');
    let answer:ChatAnswer={...answerDemoQuestion(parsed.data.question),engine:'guided'},productName:string|undefined;
    if(parsed.data.articleId){const article=demoArticles.find(a=>a.id===parsed.data.articleId);if(!article||parsed.data.question!==article.title||parsed.data.productId)throw fail(400,'Selecciona una pregunta del menú vigente.');answer={text:article.content,source:{id:article.id,title:article.title,version:article.version,name:article.source},needsHuman:['existencias','garantia','cancelacion','reembolso','danado','pedido','humano'].includes(article.id),engine:'guided'};}
    else if(!parsed.data.productId)answer=await answerWithBudget(String(row._id),parsed.data.requestId,parsed.data.question,visitorQuotaKey(req.ip??'unknown'));
    if(parsed.data.productId){
      const product=await getProductModel().findOne({_id:parsed.data.productId,companyId:demoScope.companyId,status:'ACTIVE'}).select('name sku price updatedAt').lean();
      if(!product)answer={text:'Este producto no está disponible en el catálogo activo. Solicita ayuda al equipo para revisar alternativas.',source:null,needsHuman:true};
      else{productName=product.name;const normalized=parsed.data.question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/precio|cuesta|cuanto|cotiz|producto|informacion/.test(normalized))answer={text:`${product.name} (referencia ${product.sku}). Precio consultado en el catálogo: ${product.price.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}; moneda no configurada. La disponibilidad y las condiciones finales las confirma el equipo. Esta consulta no reserva existencias ni crea una venta.`,source:{id:'catalog-'+String(product._id),title:product.name,version:new Date(product.updatedAt).toISOString(),name:'Catálogo activo · Promaxima Demo'},needsHuman:false};else answer=await answerWithBudget(String(row._id),parsed.data.requestId,parsed.data.question,visitorQuotaKey(req.ip??'unknown'));}
    }
    const updated=await Model.findOneAndUpdate({...filter,__v:row.__v,ticketId:{$exists:false}},{$push:{messages:{...parsed.data,...(productName?{productName}:{}),answer:answer.text,source:answer.source,sources:answer.sources??(answer.source?[answer.source]:[]),engine:answer.engine??'guided',limitReason:answer.limitReason,needsHuman:answer.needsHuman}},$inc:{__v:1}},{new:true}).lean().exec();
    if(!updated)throw fail(409,'La conversación cambió. Reintenta la misma pregunta.');
    res.json({ok:true,data:{...publicConversation(updated),aiRemaining:await remainingConversationAI(String(updated._id))}});
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
      const [ticket]=await getSupportTicketModel().create([{...demoScope,subject:'Chat demo: '+last.question.slice(0,100),description:('Caso ficticio del chat. Conversación: '+String(row._id)+'\nProducto consultado: '+(last.productName??'Sin producto seleccionado')+'\nÚltima pregunta: '+last.question+'\nConsulta el historial en Atención demo.').slice(0,1000),targetDate:new Date().toISOString().slice(0,10),priority:'medium',status:'open'}],{session});
      row.ticketId=String(ticket._id);await row.save({session});
      await getAuditEventModel().create([{...demoScope,userId:'demo-chat-visitor',action:'CREATE',module:'soporte',entityId:row.ticketId,details:{source:'demo-chat',conversationId:String(row._id)}}],{session});
      result=publicConversation(row);
    });}finally{await session.endSession();}
    res.json({ok:true,data:result});
  }catch(e){next(e);}});
  return router;
}
