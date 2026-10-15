import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';

// Keep cents exact in both MongoDB numbers and the clients' arithmetic.
export function validFinanceAmount(value: number): boolean {
  if (!Number.isFinite(value) || value < 0.01 || value > 999999999.99) return false;
  return Number(value.toFixed(2)) === value;
}
export const financeAmountSchema = z.number().refine(validFinanceAmount,
  'Usa un importe entre 0.01 y 999999999.99, con máximo dos decimales.');
export function normalizeFinanceAmount(value: number): number {
  if (!validFinanceAmount(value)) throw new AppError({ code: 'VALIDATION_ERROR',
    message: 'Invalid finance amount', friendlyMessage: 'Usa un importe positivo con máximo dos decimales, menor a mil millones.', statusCode: 400 });
  return Math.round(value * 100) / 100;
}
