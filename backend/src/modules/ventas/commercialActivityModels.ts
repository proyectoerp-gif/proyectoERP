import mongoose,{Schema,type Model} from 'mongoose';
import {commercialItemDefinition,type CommercialItem} from '../../core/commercialItems.js';
export type ActivityItem=CommercialItem&{delivered:number;returned:number};
export type ActivityEvent={requestId:string;fingerprint:string;action:'PAYMENT'|'DELIVERY'|'RETURN'|'REFUND'|'TERMS'|'CANCEL';date:string;note:string;amount?:number;warehouseId?:string;accountId?:string;items?:{productId:string;quantity:number;movementId:string}[];cashMovementId?:string;dueDate?:string;userId:string;createdAt:string};
export type CommercialActivity={companyId:string;branchId:string;kind:'sales'|'purchase-orders';sourceId:string;version:number;total:number;paidCents:number;refundedCents:number;items:ActivityItem[];events:ActivityEvent[];dueDate?:string;legacyReceiptId?:string;canceled?:boolean};
const itemSchema=new Schema<ActivityItem>({...commercialItemDefinition,delivered:{type:Number,required:true},returned:{type:Number,required:true}},{_id:false});
const movementSchema=new Schema({productId:String,quantity:Number,movementId:String},{_id:false});
const eventSchema=new Schema<ActivityEvent>({requestId:String,fingerprint:String,action:String,date:String,note:String,amount:Number,warehouseId:String,accountId:String,items:{type:[movementSchema],default:undefined},cashMovementId:String,dueDate:String,userId:String,createdAt:String},{_id:false});
const schema=new Schema<CommercialActivity>({companyId:{type:String,required:true},branchId:{type:String,required:true},kind:{type:String,enum:['sales','purchase-orders'],required:true},sourceId:{type:String,required:true},version:{type:Number,required:true},total:{type:Number,required:true},paidCents:{type:Number,required:true},refundedCents:{type:Number,required:true},items:{type:[itemSchema],required:true},events:{type:[eventSchema],required:true},dueDate:String,legacyReceiptId:String,canceled:Boolean},{timestamps:true});
schema.index({companyId:1,branchId:1,kind:1,sourceId:1},{unique:true});
export function getCommercialActivityModel():Model<CommercialActivity>{return mongoose.models.CommercialActivity??mongoose.model<CommercialActivity>('CommercialActivity',schema);}
