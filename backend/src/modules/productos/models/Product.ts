import mongoose, { Schema, type Model } from 'mongoose';
import type {Apparel} from '../apparel.js';
export type ProductDocument = { companyId: string; categoryId: string; name: string; sku: string; price: number; apparel?:Apparel; imageData?:string; imageVersion?:string; status: 'ACTIVE' | 'INACTIVE'; createdAt: Date; updatedAt: Date };
const apparel=new Schema({
  audience:{type:String,enum:['Mujer','Hombre','Unisex'],required:true},
  sizes:{type:[String],required:true,validate:(values:string[])=>values.length>0&&values.length<=7&&values.every(value=>['XS','S','M','L','XL','XXL','Única'].includes(value))},
  color:{type:String,required:true,maxlength:40},
  colorHex:{type:String,required:true,match:/^#[a-f0-9]{6}$/i},
  material:{type:String,required:true,maxlength:100},
  description:{type:String,required:true,maxlength:700},
  garment:{type:String,required:true,enum:['tee','shirt','knit','trousers','jeans','skirt','dress','blazer','jacket','coat','bag','cap','scarf']},
},{_id:false});
const schema = new Schema<ProductDocument>({
  companyId: { type: String, required: true, trim: true },
  categoryId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 48 },
  price: { type: Number, required: true, min: 0 },
  imageData: {type:String,select:false,maxlength:480_000},
  imageVersion: {type:String,maxlength:36},
  apparel:{type:apparel,required:false},
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true }
}, { timestamps: true });
schema.index({ companyId: 1, sku: 1 }, { unique: true });
schema.index({ companyId: 1, categoryId: 1, status: 1 });
schema.index({ companyId: 1, name: 1 });
schema.index({ companyId: 1, _id: -1 });
schema.index({companyId:1,status:1,price:1,_id:1});

let model: Model<ProductDocument> | undefined;
export function getProductModel(): Model<ProductDocument> {
  if (!model) model = mongoose.models.Product ?? mongoose.model<ProductDocument>('Product', schema);
  return model;
}
