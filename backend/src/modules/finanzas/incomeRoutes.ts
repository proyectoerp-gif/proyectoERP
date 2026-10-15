import { requireFinanceKey } from './financeIdempotency.js';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { createAuditedMoneyEntry } from './auditedMoneyEntry.js';
import { financeAmountSchema } from './financeAmount.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { tenant } from '../../middleware/tenant.js';
import { listIncomes } from './incomeService.js';
const schema = z.object({ accountId: z.string().trim().min(1).max(100), concept: z.string().trim().min(2).max(200), amount: financeAmountSchema }).strict();
function scope(req: Request): { companyId: string; branchId: string; userId: string } { const t = req.tenant; if (!t?.companyId || !t.branchId || !t.userId) throw new AppError({ code: 'UNAUTHORIZED', message: 'Tenant context missing', friendlyMessage: 'La sesion no tiene empresa y sucursal activas.', statusCode: 401 }); return { companyId: t.companyId, branchId: t.branchId, userId: t.userId }; }
export function createIncomeRoutes(): Router {
  const router = Router();
  router.get('/', authenticate, tenant, authorize('finanzas.ver'), async (req, res, next) => { try { const s = scope(req); res.json({ ok: true, data: await listIncomes(s.companyId, s.branchId) }); } catch (error) { next(error); } });
  router.post('/', authenticate, tenant, authorize('finanzas.editar'), async (req, res, next) => { try { const s = scope(req); const parsed = schema.safeParse(req.body); if (!parsed.success) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid finance data', friendlyMessage: 'Revisa los datos financieros ingresados.', statusCode: 400 }); const row = await createAuditedMoneyEntry('income', { accountId: parsed.data.accountId, concept: parsed.data.concept, amount: parsed.data.amount, companyId: s.companyId, branchId: s.branchId }, { userId: s.userId, ipAddress: req.ip, requestKey: requireFinanceKey(req.get('Idempotency-Key')) }); res.status(201).json({ ok: true, data: row }); } catch (error) { next(error); } });
  return router;
}