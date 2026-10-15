import type { ClientSession } from 'mongoose';
import { normalizeFinanceAmount } from './financeAmount.js';
import { AppError } from '../../errors/AppError.js';
import { getBankAccountModel, getExpenseModel } from './models/FinanceModels.js';
export type ExpenseStatus = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';
export type ExpenseRecord = { id: string; companyId: string; branchId: string; accountId: string; concept: string; amount: number; status: ExpenseStatus };
export async function listExpenses(companyId: string, branchId: string): Promise<ExpenseRecord[]> { const rows = await getExpenseModel().find({ companyId, branchId }).sort({ createdAt: -1 }).lean().exec(); return rows.map(({ _id, ...row }) => ({ id: String(_id), ...row, status: row.status as ExpenseStatus })); }
export async function createExpense(input: { companyId: string; branchId: string; accountId: string; concept: string; amount: number }, session?: ClientSession): Promise<ExpenseRecord> {
  const amount = normalizeFinanceAmount(input.amount);
  const accountQuery = getBankAccountModel().exists({ _id: input.accountId, companyId: input.companyId, branchId: input.branchId, status: 'ACTIVE' });
  const account = await (session ? accountQuery.session(session) : accountQuery);
  if (!account) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Expense account not found', friendlyMessage: 'La cuenta debe estar activa y pertenecer a tu empresa y sucursal.', statusCode: 400 });
  const data = { ...input, concept: input.concept.trim(), amount, status: 'PENDIENTE' as const };
  const row = session ? (await getExpenseModel().create([data], { session }))[0] : await getExpenseModel().create(data);
  return { id: String(row._id), companyId: row.companyId, branchId: row.branchId, accountId: row.accountId, concept: row.concept, amount: row.amount, status: row.status as ExpenseStatus };
}