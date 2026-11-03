import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import { catalogFilter } from './catalogPagination.js';
export type CommercialQuery = { cursor?: string; limit: number; status?: string; search?: string };
export function parseCommercialQuery(query: unknown, kind: 'sales' | 'purchase-orders'): CommercialQuery {
 const schema = z.object({ cursor: z.string().regex(/^[a-f0-9]{24}$/i).optional(), limit: z.coerce.number().int().min(1).max(50).default(20), search:z.string().trim().max(80).optional(), status: z.enum(kind === 'sales' ? ['PENDIENTE','PAGADA','CANCELADA'] : ['PENDIENTE','APROBADA','RECIBIDA','CANCELADA']).optional() }).strict();
 const parsed = schema.safeParse(query); if (!parsed.success) throw new AppError({code:'VALIDATION_ERROR',message:'Invalid commercial page query',friendlyMessage:'Revisa el estado y la página solicitada.',statusCode:400}); return parsed.data;
}
export function commercialFilter(companyId: string, branchId: string, query: CommercialQuery): Record<string, unknown> {
 const filter=catalogFilter({companyId,branchId},{cursor:query.cursor,limit:query.limit,search:query.search??''},['items.productName','items.sku']);
 if(query.status)filter.status=query.status;
 if(query.search&&/^[a-f0-9]{24}$/i.test(query.search)){
  filter.$or=[...(filter.$or as Record<string,unknown>[]),{_id:query.search}];
 }
 return filter;
}
