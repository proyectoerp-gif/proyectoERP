import {boundedLegacyRows} from '../../core/legacyList.js';
import mongoose,{type ClientSession} from 'mongoose';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import { AppError } from '../../errors/AppError.js';
import { getProductModel } from '../productos/models/Product.js';
import { getStockTransferModel, type StockTransferStatus } from './models/StockTransfer.js';
import { getWarehouseModel } from './models/Warehouse.js';
export type TransferRecord = { id: string; companyId: string; branchId: string; fromWarehouseId: string; toWarehouseId: string; productId: string; quantity: number; status: StockTransferStatus };
export async function listTransfers(companyId: string, branchId: string): Promise<TransferRecord[]> {
  const rows = await getStockTransferModel().find({ companyId, branchId }).sort({ createdAt: -1 }).limit(201).lean().exec();
  return boundedLegacyRows(rows).map(({ _id, ...row }) => ({ id: String(_id), ...row }));
}
export async function createTransfer(input: { companyId: string; branchId: string; fromWarehouseId: string; toWarehouseId: string; productId: string; quantity: number; status: StockTransferStatus },session?:ClientSession): Promise<TransferRecord> {
  if (input.fromWarehouseId === input.toWarehouseId) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Transfer warehouses must differ', friendlyMessage: 'El almacen de origen y destino deben ser diferentes.', statusCode: 400 });
  if (input.status !== 'PENDIENTE') throw new AppError({ code: 'VALIDATION_ERROR', message: 'New transfer must be pending', friendlyMessage: 'Una transferencia nueva debe iniciar como pendiente.', statusCode: 400 });
  const Warehouse = getWarehouseModel();
  const [from, to, product] = await Promise.all([
    Warehouse.exists({ _id: input.fromWarehouseId, companyId: input.companyId, branchId: input.branchId, status: 'ACTIVE' }),
    Warehouse.exists({ _id: input.toWarehouseId, companyId: input.companyId, branchId: input.branchId, status: 'ACTIVE' }),
    getProductModel().exists({ _id: input.productId, companyId: input.companyId, status: 'ACTIVE' })
  ]);
  if (!from || !to || !product) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Transfer references are invalid', friendlyMessage: 'Verifica que ambos almacenes y el producto pertenezcan a tu empresa y esten activos.', statusCode: 400 });
  const row = session?await getStockTransferModel().create([{...input,status:'PENDIENTE'}],{session}).then(rows=>rows[0]):await getStockTransferModel().create({...input,status:'PENDIENTE'});
  return { id: String(row._id), companyId: row.companyId, branchId: row.branchId, fromWarehouseId: row.fromWarehouseId, toWarehouseId: row.toWarehouseId, productId: row.productId, quantity: row.quantity, status: row.status };
}
export async function createTransferAudited(input:Parameters<typeof createTransfer>[0],actor:{userId:string;ipAddress?:string}){await Promise.all([getStockTransferModel().init(),getAuditEventModel().init()]);const session=await mongoose.startSession();try{return await session.withTransaction(async()=>{const row=await createTransfer(input,session);await getAuditEventModel().create([{userId:actor.userId,companyId:input.companyId,branchId:input.branchId,action:'CREATE',module:'inventario',entityId:row.id,ipAddress:actor.ipAddress}],{session});return row;});}finally{await session.endSession();}}
