import {createHash} from 'node:crypto';
import mongoose,{Schema,type Model} from 'mongoose';
import {AppError} from '../../errors/AppError.js';
import {env} from '../../config/env.js';
import {generateAnswer,generativeEnabled,guidedFallback,localAnswer,type ChatAnswer} from './generative.js';

type Attempt={conversationId:string;requestId:string;fingerprint:string;answer?:ChatAnswer;expiresAt:Date};
const attemptSchema=new Schema<Attempt>({conversationId:{type:String,required:true},requestId:{type:String,required:true},fingerprint:{type:String,required:true},answer:Schema.Types.Mixed,expiresAt:{type:Date,required:true}},{timestamps:true});
attemptSchema.index({conversationId:1,requestId:1},{unique:true});
attemptSchema.index({expiresAt:1},{expireAfterSeconds:0});
type Budget={day:string;count:number;expiresAt:Date};
const budgetSchema=new Schema<Budget>({day:{type:String,required:true,unique:true},count:{type:Number,default:0},expiresAt:{type:Date,required:true}});
budgetSchema.index({expiresAt:1},{expireAfterSeconds:0});
export const getGenerationAttemptModel=():Model<Attempt>=>mongoose.models.DemoGenerationAttempt??mongoose.model<Attempt>('DemoGenerationAttempt',attemptSchema);
export const getGenerationBudgetModel=():Model<Budget>=>mongoose.models.DemoGenerationBudget??mongoose.model<Budget>('DemoGenerationBudget',budgetSchema);
const pending=()=>new AppError({code:'CONFLICT',statusCode:409,message:'Generation pending',friendlyMessage:'La pregunta está en proceso. Reintenta la misma solicitud en unos segundos.'});

// Unique attempts avoid paying twice for browser retries, including across API replicas.
// The UTC daily counter reserves an attempt before any provider call; failed calls count too.
export async function answerWithBudget(conversationId:string,requestId:string,question:string):Promise<ChatAnswer>{
  const local=localAnswer(question);if(local)return local;
  if(!generativeEnabled())return generateAnswer(question);
  const AttemptModel=getGenerationAttemptModel(),BudgetModel=getGenerationBudgetModel();
  await Promise.all([AttemptModel.init(),BudgetModel.init()]);
  const key={conversationId,requestId},fingerprint=createHash('sha256').update(question).digest('hex');
  const existing=await AttemptModel.findOne(key).lean();
  if(existing){if(existing.fingerprint!==fingerprint)throw pending();if(existing.answer)return existing.answer;
    // A crashed process must not leave the visitor permanently blocked. Never call the provider again.
    if(existing.expiresAt.getTime()-7*86400_000<Date.now()-60_000){const fallback=guidedFallback(question);await AttemptModel.updateOne({...key,answer:{$exists:false}},{$set:{answer:fallback}});return fallback;}throw pending();}
  const expiresAt=new Date(Date.now()+7*86400_000);
  try{await AttemptModel.create({...key,fingerprint,expiresAt});}catch(error){if((error as any)?.code===11000)throw pending();throw error;}
  let answer=guidedFallback(question);
  try{
    const day=new Date().toISOString().slice(0,10);
    try{await BudgetModel.updateOne({day},{$setOnInsert:{count:0,expiresAt:new Date(Date.now()+3*86400_000)}},{upsert:true});}catch(error){if((error as any)?.code!==11000)throw error;}
    const reserved=await BudgetModel.findOneAndUpdate({day,count:{$lt:env.CHATBOT_DAILY_LIMIT}},{$inc:{count:1}},{new:true}).lean();
    if(reserved)answer=await generateAnswer(question);
  }catch{ /* A quota or provider failure keeps the approved guided response available. */ }
  await AttemptModel.updateOne(key,{$set:{answer}});
  return answer;
}
