import {commercialItemSchema,type CommercialItem} from '../../../core/commercialItems.js';
import mongoose, { Schema, type Model } from 'mongoose';
export type SaleStatus = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';
// With items present, legacy product/quantity/unitPrice fields mirror the first item; total covers the whole sale.
export type SaleDocument = { companyId: string; branchId: string; customerId: string; productId: string; quantity: number; unitPrice: number; total: number; items?: CommercialItem[]; status: SaleStatus; createdAt: Date; updatedAt: Date };
const schema = new Schema<SaleDocument>({
  companyId: { type: String, required: true, trim: true }, branchId: { type: String, required: true, trim: true },
  customerId: { type: String, required: true, trim: true }, productId: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.000001 }, unitPrice: { type: Number, required: true, min: 0 }, total: { type: Number, required: true, min: 0 },
  items: {type:[commercialItemSchema],default:undefined},
  status: { type: String, enum: ['PENDIENTE', 'PAGADA', 'CANCELADA'], default: 'PENDIENTE', required: true }
}, { timestamps: true });
schema.index({ companyId: 1, branchId: 1, createdAt: -1 });
schema.index({ companyId: 1, branchId: 1, _id: -1 });
schema.index({ companyId: 1, branchId: 1, status: 1, _id: -1 });
let model: Model<SaleDocument> | undefined;
export function getSaleModel(): Model<SaleDocument> {
  if (!model) model = mongoose.models.Sale ?? mongoose.model<SaleDocument>('Sale', schema);
  return model;
}
