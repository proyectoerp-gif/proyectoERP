import { financeTransaction, type FinanceActor } from './financeIdempotency.js';
import { normalizeFinanceAmount } from './financeAmount.js';
import { AppError } from '../../errors/AppError.js';
import { getAuditEventModel } from '../auditoria/models/AuditEvent.js';
import { getExpenseModel, getIncomeModel } from './models/FinanceModels.js';
import { createIncome } from './incomeService.js';
import { createExpense } from './expenseService.js';

export async function createAuditedMoneyEntry(kind: 'income' | 'expense',
  input: Parameters<typeof createIncome>[0], actor: FinanceActor) {
  if (!actor.userId.trim()) throw new AppError({ code: 'UNAUTHORIZED', message: 'Missing finance actor',
    friendlyMessage: 'Inicia sesión para registrar el movimiento.', statusCode: 401 });
  const model = kind === 'income' ? getIncomeModel() : getExpenseModel();
  await Promise.all([model.init(), getAuditEventModel().init()]);
  const payload = { accountId: input.accountId, concept: input.concept.trim(), amount: normalizeFinanceAmount(input.amount) };
  return financeTransaction(input, actor, kind, payload, async session => {
      const row = await (kind === 'income' ? createIncome : createExpense)(input, session);
      await getAuditEventModel().create([{ userId: actor.userId, companyId: input.companyId,
        branchId: input.branchId, action: 'CREATE', module: kind === 'income' ? 'finanzas.ingresos' : 'finanzas.egresos',
        entityId: row.id, details: { amount: row.amount, accountId: row.accountId, status: row.status },
        ipAddress: actor.ipAddress }], { session });
      return row;
  });
}
