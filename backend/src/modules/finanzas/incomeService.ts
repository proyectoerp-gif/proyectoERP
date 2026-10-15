import type { ClientSession } from 'mongoose';
import { normalizeFinanceAmount } from './financeAmount.js';
import { AppError } from '../../errors/AppError.js';
import { getBankAccountModel, getIncomeModel } from './models/FinanceModels.js';
export type IncomeStatus = 'PENDIENTE' | 'RECIBIDO' | 'CANCELADO';
export type IncomeRecord = { id: string; companyId: string; branchId: string; accountId: string; concept: string; amount: number; status: IncomeStatus };
export async function listIncomes(companyId: string, branchId: string): Promise<IncomeRecord[]> { const rows = await getIncomeModel().find({ companyId, branchId }).sort({ createdAt: -1 }).lean().exec(); return rows.map(({ _id, ...row }) => ({ id: String(_id), ...row, status: row.status as IncomeStatus })); }
export async function createIncome(input: { companyId: string; branchId: string; accountId: string; concept: string; amount: number }, session?: ClientSession): Promise<IncomeRecord> {
  const amount = normalizeFinanceAmount(input.amount);
  const accountQuery = getBankAccountModel().exists({ _id: input.accountId, companyId: input.companyId, branchId: input.branchId, status: 'ACTIVE' });
  const account = await (session ? accountQuery.session(session) : accountQuery);
  if (!account) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Income account not found', friendlyMessage: 'La cuenta debe estar activa y pertenecer a tu empresa y sucursal.', statusCode: 400 });
  const data = { ...input, concept: input.concept.trim(), amount, status: 'PENDIENTE' as const };
  const row = session ? (await getIncomeModel().create([data], { session }))[0] : await getIncomeModel().create(data);
  return { id: String(row._id), companyId: row.companyId, branchId: row.branchId, accountId: row.accountId, concept: row.concept, amount: row.amount, status: row.status as IncomeStatus };
}