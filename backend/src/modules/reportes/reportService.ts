import mongoose,{type ClientSession} from 'mongoose';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {catalogSlice} from '../../core/catalogPagination.js';
import {z} from 'zod';
import {companyTimezone} from './reportTimezone.js';
import {previewReport} from './reportPreview.js';
import { AppError } from '../../errors/AppError.js';
import { getProductModel } from '../productos/models/Product.js';
import { getWarehouseModel } from '../inventario/models/Warehouse.js';
import { getReportModel, type ReportPeriod, type ReportType } from './models/Report.js';

async function buildReportData(companyId: string, branchId: string, type: ReportType, period: ReportPeriod): Promise<Record<string, unknown>> {
  if(type!=='inventory'){
    const report=await previewReport(companyId,branchId,type==='sales'?'sales':'cash-flow',period,new Date(),await companyTimezone(companyId));
    return {from:report.from,to:report.to,timezone:report.timezone,basis:report.basis,source:type==='sales'?'sales':'cashMovements',...report.metrics};
  }
  const [products, warehouses] = await Promise.all([
    getProductModel().countDocuments({ companyId, status: 'ACTIVE' }).exec(),
    getWarehouseModel().countDocuments({ companyId, branchId, status: 'ACTIVE' }).exec()
  ]);
  return { asOf:new Date().toISOString(), basis:'currentCatalog', periodApplied:false, activeProducts: products, activeWarehouses: warehouses };
}

function serialize(row: Record<string, any>): Record<string, unknown> {
  const { _id, ...rest } = row;
  return { id: String(_id), ...rest };
}

export async function listReports(companyId: string, branchId: string, types: ReportType[] = []): Promise<Array<Record<string, unknown>>> {
  if (!types.length) return [];
  const rows = await getReportModel().find({ companyId, branchId, type: { $in: types } }).sort({ createdAt: -1 }).limit(201).lean().exec();
  if(rows.length>200)throw new AppError({code:'VALIDATION_ERROR',statusCode:413,message:'Legacy listing too large',friendlyMessage:'Este listado requiere paginación. Usa la búsqueda por páginas.'});
  return rows.map((row) => serialize(row as Record<string, any>));
}

export async function createReport(input: {
  companyId: string; branchId: string; userId: string; name: string;
  type: ReportType; period: ReportPeriod; filters?: Record<string, unknown>;
},session?:ClientSession): Promise<Record<string, unknown>> {
  const companyId = input.companyId.trim();
  const branchId = input.branchId.trim();
  const userId = input.userId.trim();
  const name = input.name.trim();
  const types: ReportType[] = ['sales', 'cash-flow', 'inventory', 'financial'];
  const periods: ReportPeriod[] = ['day', 'week', 'month', 'quarter', 'year'];
  if (!companyId || !branchId || !userId || !name || name.length > 120 || !types.includes(input.type) || !periods.includes(input.period)) {
    throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid report input', friendlyMessage: 'Revisa el nombre, tipo y periodo del reporte.', statusCode: 400 });
  }
  if(input.filters && Object.keys(input.filters).length)throw new AppError({code:'VALIDATION_ERROR',message:'Unsupported report filters',friendlyMessage:'Este reporte todavía no admite filtros adicionales.',statusCode:400});
  const data = await buildReportData(companyId, branchId, input.type, input.period);
  const payload={companyId,branchId,userId,name,type:input.type,period:input.period,filters:input.filters??{},data};
  const row=session?(await getReportModel().create([payload],{session}))[0]:await getReportModel().create(payload);
  return serialize(row.toObject() as Record<string, any>);
}

export async function createReportAudited(input:Parameters<typeof createReport>[0]){await Promise.all([getReportModel().init(),getAuditEventModel().init()]);const session=await mongoose.startSession();try{return await session.withTransaction(async()=>{const row=await createReport(input,session);await getAuditEventModel().create([{companyId:input.companyId,branchId:input.branchId,userId:input.userId,action:'CREATE',module:'reportes',entityId:row.id,details:{type:input.type,period:input.period}}],{session});return row;});}finally{await session.endSession();}}
export const reportPageSchema=z.object({cursor:z.string().regex(/^[a-f0-9]{24}$/i).optional(),limit:z.coerce.number().int().min(1).max(50).default(20)}).strict();
export async function pageReports(companyId:string,branchId:string,types:ReportType[],raw:unknown){const p=reportPageSchema.safeParse(raw);if(!p.success)throw new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid report page',friendlyMessage:'Revisa la página de informes.'});if(!types.length)return {items:[],nextCursor:null};const rows=await getReportModel().find({companyId,branchId,type:{$in:types},...(p.data.cursor?{_id:{$lt:p.data.cursor}}:{})}).sort({_id:-1}).limit(p.data.limit+1).lean();return catalogSlice(rows,p.data.limit);}
