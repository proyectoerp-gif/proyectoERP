import mongoose from 'mongoose';
import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {AppError} from '../../errors/AppError.js';
import {hashPassword,verifyPassword} from '../../security/password.js';
import {getUserModel} from '../usuarios/models/User.js';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {sendResendEmail} from './resendEmail.js';
export const newPasswordSchema=z.string().min(12).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72);
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
const invalid=()=>new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid password operation',friendlyMessage:'Revisa la contraseña o solicita un enlace nuevo.'});
export async function revokeSessions(scope:{id:string;companyId:string;branchId:string}){
 const row=await getUserModel().updateOne({_id:scope.id,companyId:scope.companyId,branchId:scope.branchId,isActive:true},{$inc:{sessionVersion:1}});
 if(!row.matchedCount)throw invalid();return {revoked:true};
}
export async function changePassword(scope:{id:string;companyId:string;branchId:string},currentPassword:string,password:string){
 if(!newPasswordSchema.safeParse(password).success||currentPassword===password)throw invalid();
 const row=await getUserModel().findOne({_id:scope.id,companyId:scope.companyId,branchId:scope.branchId,isActive:true}).select('+passwordHash').lean();
 if(!row||!await verifyPassword(currentPassword,row.passwordHash))throw invalid();
 return savePassword({_id:row._id,passwordHash:row.passwordHash,isActive:true},password,'PASSWORD_CHANGED');
}
async function savePassword(filter:Record<string,unknown>,password:string,action:string){
 const hash=await hashPassword(password),session=await mongoose.startSession();await getAuditEventModel().init();
 try{return await session.withTransaction(async()=>{
  const row=await getUserModel().findOneAndUpdate(filter,{$set:{passwordHash:hash},$inc:{sessionVersion:1},$unset:{passwordResetHash:1,passwordResetExpiresAt:1}},{new:true,session}).lean();
  if(!row)throw invalid();
  await getAuditEventModel().create([{userId:String(row._id),companyId:row.companyId,branchId:row.branchId,action:'UPDATE',module:'auth',entityId:String(row._id),details:{operation:action,sessionsRevoked:true}}],{session});return {changed:true};
 });}finally{await session.endSession();}
}
export async function requestPasswordReset(email:string,config:{apiKey?:string;from:string;baseUrl:string},send=sendResendEmail){
 if(!config.apiKey)throw new AppError({code:'INTERNAL',statusCode:503,message:'Recovery mail unavailable',friendlyMessage:'El envío de recuperación no está configurado. Contacta al administrador.'});
 const now=new Date(),token=randomBytes(32).toString('hex'),hash=digest(token),Model=getUserModel();
 const row=await Model.findOneAndUpdate({email:email.trim().toLowerCase(),isActive:true,$or:[{passwordResetSentAt:{$exists:false}},{passwordResetSentAt:{$lte:new Date(now.getTime()-60000)}}]},{$set:{passwordResetHash:hash,passwordResetExpiresAt:new Date(now.getTime()+900000),passwordResetSentAt:now}},{new:true}).lean();
 if(row){try{await send(config,{to:row.email,subject:'Recuperación de acceso a Núcleo ERP',text:'Si solicitaste cambiar tu contraseña, abre este enlace. Caduca en 15 minutos y solo puede usarse una vez.\n'+config.baseUrl.replace(/\/+$/,'')+'/auth/password-reset/confirm?token='+token+'\nSi no lo solicitaste, ignora este correo.'});}catch{console.warn(JSON.stringify({event:'password_reset_delivery_failed'}));await Model.updateOne({_id:row._id,passwordResetHash:hash},{$unset:{passwordResetHash:1,passwordResetExpiresAt:1}});}}
 return {message:'Si la cuenta existe y el correo está disponible, recibirás instrucciones.'};
}
export async function resetPassword(token:unknown,password:unknown){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!newPasswordSchema.safeParse(password).success)throw invalid();
 return savePassword({passwordResetHash:digest(token),passwordResetExpiresAt:{$gt:new Date()},isActive:true},password as string,'PASSWORD_RESET');
}
