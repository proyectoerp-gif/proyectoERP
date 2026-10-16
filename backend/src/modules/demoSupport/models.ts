import mongoose, { Schema, type Model } from 'mongoose';
export type DemoConversationDocument={companyId:string;branchId:string;accessHash:string;messages:{requestId:string;question:string;answer:string;source:unknown;needsHuman:boolean}[];ticketId?:string;expiresAt:Date;createdAt:Date;updatedAt:Date;__v:number};
const message = new Schema({ requestId: {type:String,required:true}, question: {type:String,required:true,maxlength:500}, answer: {type:String,required:true}, source: {type:Schema.Types.Mixed,default:null}, needsHuman: {type:Boolean,required:true} }, {_id:false});
const schema = new Schema<DemoConversationDocument>({
  companyId: {type:String,required:true}, branchId: {type:String,required:true},
  accessHash: {type:String,required:true,select:false}, messages: {type:[message],default:[]},
  ticketId: {type:String}, expiresAt: {type:Date,required:true}
}, {timestamps:true, optimisticConcurrency:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});
schema.index({companyId:1,branchId:1,_id:-1});
export const getDemoConversationModel = ():Model<DemoConversationDocument> => mongoose.models.DemoConversation ?? mongoose.model<DemoConversationDocument>('DemoConversation',schema);
