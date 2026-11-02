import type {NextFunction,Request,Response} from 'express';
import mongoose,{Schema} from 'mongoose';
import {createHash} from 'node:crypto';
import {AppError} from '../errors/AppError.js';
const schema=new Schema({_id:String,count:{type:Number,default:0},expiresAt:Date},{versionKey:false});
schema.index({expiresAt:1},{expireAfterSeconds:0});
const memory=new Map<string,{count:number;expiresAt:number}>();
export async function reserveRequest(bucket:string,limit:number,windowMs:number,now=Date.now()):Promise<boolean>{
 const start=Math.floor(now/windowMs)*windowMs,key=bucket+':'+start;
 if(process.env.NODE_ENV!=='production'){
  for(const [k,v] of memory)if(v.expiresAt<=now)memory.delete(k);
  if(!memory.has(key)&&memory.size>=20000)return false;
  const current=memory.get(key)??{count:0,expiresAt:start+windowMs};
  memory.set(key,current);if(current.count>=limit)return false;current.count++;return true;
 }
 const Model=mongoose.models.RequestQuota??mongoose.model('RequestQuota',schema);
 await Model.init();
 try{await Model.updateOne({_id:key},{$setOnInsert:{count:0,expiresAt:new Date(start+windowMs+60000)}},{upsert:true});}catch(e){if((e as {code?:number}).code!==11000)throw e;}
 return !!await Model.findOneAndUpdate({_id:key,count:{$lt:limit}},{$inc:{count:1}},{new:true}).lean();
}
export function requestLimit(category:string,limit:number,windowMs=60000,global=false){
 return async(req:Request,res:Response,next:NextFunction)=>{
  try{const identity=global?'global':createHash('sha256').update(req.ip??'unknown').digest('hex');
   if(!await reserveRequest(category+':'+identity,limit,windowMs)){res.set('Retry-After',String(Math.ceil((windowMs-Date.now()%windowMs)/1000)));return next(new AppError({code:'RATE_LIMITED',statusCode:429,message:'Request quota exceeded',friendlyMessage:'Has alcanzado el límite temporal. Espera antes de continuar.'}));}
   next();
  }catch{next(new AppError({code:'INTERNAL',statusCode:503,message:'Quota unavailable',friendlyMessage:'No se pudo validar el límite de solicitudes. Inténtalo más tarde.'}));}
 };
}
const reads=requestLimit('api-read',600),writes=requestLimit('api-write',120);
export function rateLimit(req:Request,res:Response,next:NextFunction){return (['GET','HEAD','OPTIONS'].includes(req.method)?reads:writes)(req,res,next);}
