import { createHash } from 'node:crypto';
import mongoose, { Schema, type ClientSession } from 'mongoose';
import { AppError } from '../../errors/AppError.js';

type Receipt = { companyId: string; branchId: string; userId: string; kind: string;
  key: string; hash: string; response: unknown };
const schema = new Schema<Receipt>({ companyId: { type: String, required: true },
  branchId: { type: String, required: true }, userId: { type: String, required: true },
  kind: { type: String, required: true }, key: { type: String, required: true },
  hash: { type: String, required: true }, response: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });
schema.index({ companyId: 1, branchId: 1, userId: 1, kind: 1, key: 1 }, { unique: true });
export function getFinanceRequestModel() {
  return mongoose.models.FinanceRequest as mongoose.Model<Receipt> | undefined
    ?? mongoose.model<Receipt>('FinanceRequest', schema);
}
export function requireFinanceKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(value)) {
    throw new AppError({ code: 'VALIDATION_ERROR', message: 'Missing or invalid Idempotency-Key',
      friendlyMessage: 'Actualiza la aplicación antes de registrar el movimiento: falta un identificador de operación válido.', statusCode: 400 });
  }
  return value;
}
export type FinanceActor = { userId: string; ipAddress?: string; requestKey?: string };

export async function financeTransaction<T>(scope: { companyId: string; branchId: string },
  actor: FinanceActor, kind: 'income' | 'expense' | 'cash', payload: Record<string, unknown>,
  write: (session: ClientSession) => Promise<T>): Promise<T> {
  // Internal callers without a key retain atomicity; all public POST routes require one.
  const key = actor.requestKey === undefined ? undefined : requireFinanceKey(actor.requestKey);
  const model = getFinanceRequestModel();
  if (key) await model.init();
  const filter = { companyId: scope.companyId, branchId: scope.branchId, userId: actor.userId, kind, key };
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b))));
  const hash = createHash('sha256').update(canonical).digest('hex');
  function replay(receipt: Receipt): T {
    if (receipt.hash !== hash) throw new AppError({ code: 'CONFLICT', message: 'Idempotency key reused with different payload',
      friendlyMessage: 'Este identificador ya corresponde a otro movimiento. Recupera el resultado original antes de registrar uno diferente.', statusCode: 409 });
    return receipt.response as T;
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      if (key) {
        const existing = await model.findOne(filter).session(session).lean().exec();
        if (existing) return replay(existing);
      }
      const result = await write(session);
      if (key) await model.create([{ ...filter, hash, response: result }], { session });
      return result;
    });
  } catch (error) {
    // A simultaneous request may have committed first. Its unique receipt rolls
    // back this entire attempt, including its movement and audit record.
    if (key && typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      const existing = await model.findOne(filter).lean().exec();
      if (existing) return replay(existing);
    }
    throw error;
  } finally { await session.endSession(); }
}
