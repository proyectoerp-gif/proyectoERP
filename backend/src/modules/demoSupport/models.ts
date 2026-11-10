import mongoose, { Schema, type Model } from 'mongoose';
export type DemoConversationDocument={companyId:string;branchId:string;accessHash:string;messages:{catalogSelection?:{productId:string;quantity:number}[];requestId:string;question:string;answer:string;source:unknown;needsHuman:boolean;productId?:string;productName?:string;sources?:unknown[];engine?:string;limitReason?:string;articleId?:string}[];ticketId?:string;expiresAt:Date;createdAt:Date;updatedAt:Date;__v:number};
const selection=new Schema({productId:{type:String,required:true,match:/^[a-f0-9]{24}$/i},quantity:{type:Number,required:true,min:1,max:100,validate:Number.isInteger}},{_id:false});
const message = new Schema({catalogSelection:{type:[selection],default:undefined,validate:(rows:unknown[])=>rows.length<=20}, requestId: {type:String,required:true}, question: {type:String,required:true,maxlength:500}, answer: {type:String,required:true}, source: {type:Schema.Types.Mixed,default:null}, needsHuman: {type:Boolean,required:true},productId:String,productName:String,sources:{type:[Schema.Types.Mixed],default:[]},engine:{type:String,enum:['guided','openai','gemini','fallback'],default:'guided'},limitReason:String,articleId:String }, {_id:false});
const schema = new Schema<DemoConversationDocument>({
  companyId: {type:String,required:true}, branchId: {type:String,required:true},
  accessHash: {type:String,required:true,select:false}, messages: {type:[message],default:[]},
  ticketId: {type:String}, expiresAt: {type:Date,required:true}
}, {timestamps:true, optimisticConcurrency:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});
schema.index({companyId:1,branchId:1,_id:-1});
export const getDemoConversationModel = ():Model<DemoConversationDocument> => mongoose.models.DemoConversation ?? mongoose.model<DemoConversationDocument>('DemoConversation',schema);
