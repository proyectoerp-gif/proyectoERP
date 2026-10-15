import mongoose from 'mongoose';
import { AppError } from '../../errors/AppError.js';
import { getAuditEventModel } from '../auditoria/models/AuditEvent.js';
import { getExpenseModel, getIncomeModel } from './models/FinanceModels.js';
import { createIncome } from './incomeService.js';
import { createExpense } from './expenseService.js';

export async function createAuditedMoneyEntry(kind: 'income' | 'expense',
  input: Parameters<typeof createIncome>[0], actor: { userId: string; ipAddress?: string }) {
  if (!actor.userId.trim()) throw new AppError({ code: 'UNAUTHORIZED', message: 'Missing finance actor',
    friendlyMessage: 'Inicia sesión para registrar el movimiento.', statusCode: 401 });
  const model = kind === 'income' ? getIncomeModel() : getExpenseModel();
  await Promise.all([model.init(), getAuditEventModel().init()]);
  const session = await mongoose.startSession();
  let result: Awaited<ReturnType<typeof createIncome>> | Awaited<ReturnType<typeof createExpense>> | undefined;
  try {
    await session.withTransaction(async () => {
      const row = await (kind === 'income' ? createIncome : createExpense)(input, session);
      await getAuditEventModel().create([{ userId: actor.userId, companyId: input.companyId,
        branchId: input.branchId, action: 'CREATE', module: kind === 'income' ? 'finanzas.ingresos' : 'finanzas.egresos',
        entityId: row.id, details: { amount: row.amount, accountId: row.accountId, status: row.status },
        ipAddress: actor.ipAddress }], { session });
      result = row;
    });
    return result!;
  } finally { await session.endSession(); }
}
