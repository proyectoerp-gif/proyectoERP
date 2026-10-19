import {prepareCommercialItems,sumItemTotals,itemsError,saleItemsInput,type CommercialItem} from '../../core/commercialItems.js';
import { commercialTotal } from '../../core/commercialAmount.js';
import type { ClientSession } from 'mongoose';
import { commercialFilter, type CommercialQuery } from '../../core/commercialPagination.js';
import { catalogSlice } from '../../core/catalogPagination.js';
import { allowedTransactionTransition } from '../../core/transactionStatus.js';
import { AppError } from '../../errors/AppError.js';
import { getCustomerModel } from '../clientes/models/Customer.js';
import { getProductModel } from '../productos/models/Product.js';
import { getSaleModel, type SaleStatus } from './models/Sale.js';
export type SaleRecord = { id: string; companyId: string; branchId: string; customerId: string; productId: string; quantity: number; unitPrice: number; total: number; items?:CommercialItem[]; status: SaleStatus };
export async function listSales(companyId: string, branchId: string): Promise<SaleRecord[]> {
  const rows = await getSaleModel().find({ companyId, branchId }).sort({ createdAt: -1 }).lean().exec();
  return rows.map(({ _id, ...row }) => ({ id: String(_id), ...row }));
}
export async function createSale(input: { companyId: string; branchId: string; customerId: string; productId: string; quantity: number } | {companyId:string;branchId:string;customerId:string;items:{productId:string;quantity:number}[]}, session?: ClientSession): Promise<SaleRecord> {
  if('items' in input){
    const parsed=saleItemsInput.safeParse({customerId:input.customerId,items:input.items});if(!parsed.success)throw itemsError();
    const contact=await getCustomerModel().exists({_id:parsed.data.customerId,companyId:input.companyId,branchId:input.branchId,status:'ACTIVE'}).session(session??null);
    if(!contact)throw new AppError({code:'VALIDATION_ERROR',message:'Invalid contact',friendlyMessage:'Selecciona un contacto activo de tu empresa y sucursal.',statusCode:400});
    const items=await prepareCommercialItems(input.companyId,parsed.data.items,true,session),first=items[0];
    const payload={companyId:input.companyId,branchId:input.branchId,customerId:parsed.data.customerId,productId:first.productId,quantity:first.quantity,unitPrice:first.unitPrice,items,total:sumItemTotals(items),status:'PENDIENTE'};
    const row=session?(await getSaleModel().create([payload],{session}))[0]:await getSaleModel().create(payload);
    return {id:String(row._id),...payload,status:'PENDIENTE'};
  }
  const [customer, product] = await Promise.all([
    getCustomerModel().exists({ _id: input.customerId, companyId: input.companyId, branchId: input.branchId, status: 'ACTIVE' }).session(session ?? null),
    getProductModel().findOne({ _id: input.productId, companyId: input.companyId, status: 'ACTIVE' }).session(session ?? null).select('price').lean().exec()
  ]);
  if (!customer || !product) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Sale references are invalid', friendlyMessage: 'El cliente y el producto deben existir, estar activos y pertenecer a tu empresa; el contacto debe ser de tu sucursal.', statusCode: 400 });
  const unitPrice = Number(product.price);
  const total = commercialTotal(input.quantity, unitPrice);
  const row = session ? (await getSaleModel().create([{ ...input, unitPrice, total, status: 'PENDIENTE' }], { session }))[0] : await getSaleModel().create({ ...input, unitPrice, total, status: 'PENDIENTE' });
  return { id: String(row._id), companyId: row.companyId, branchId: row.branchId, customerId: row.customerId, productId: row.productId, quantity: row.quantity, unitPrice: row.unitPrice, total: row.total, ...(row.items?.length?{items:row.items}:{}), status: row.status };
}
export async function updateSaleStatus(id: string, companyId: string, branchId: string, expectedStatus: SaleStatus, status: SaleStatus, session?: ClientSession): Promise<SaleRecord> {
  if (!allowedTransactionTransition('sales', expectedStatus, status)) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Unsupported status transition', friendlyMessage: 'Este cambio de estado no está permitido.', statusCode: 400 });
  const row = await getSaleModel().findOneAndUpdate(
    { _id: id, companyId, branchId, status: expectedStatus },
    { $set: { status } }, { new: true, runValidators: true, ...(session ? { session } : {}) }
  ).exec();
  if (!row) throw new AppError({ code: 'CONFLICT', message: 'Transaction unavailable or state changed', friendlyMessage: 'El registro cambió o no está disponible en esta sucursal. Actualiza el listado.', statusCode: 409 });
  return { id: String(row._id), companyId: row.companyId, branchId: row.branchId, customerId: row.customerId, productId: row.productId, quantity: row.quantity, unitPrice: row.unitPrice, total: row.total, ...(row.items?.length?{items:row.items}:{}), status: row.status };
}

export async function pageSales(companyId: string, branchId: string, query: CommercialQuery) { const rows = await getSaleModel().find(commercialFilter(companyId, branchId, query)).sort({ _id: -1 }).limit(query.limit + 1).lean().exec(); return catalogSlice(rows, query.limit); }
