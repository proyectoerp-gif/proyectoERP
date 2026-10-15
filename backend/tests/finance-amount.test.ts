import { describe, expect, it } from 'vitest';
import { financeAmountSchema, normalizeFinanceAmount } from '../src/modules/finanzas/financeAmount.js';

describe('finance amount boundaries', () => {
  it.each([0.01, 0.29, 19.99, 1250.5, 999999999.99])('accepts exact cent amount %s', value => {
    expect(financeAmountSchema.parse(value)).toBe(value);
    expect(normalizeFinanceAmount(value)).toBe(value);
  });
  it.each([0, -1, 0.001, 1.001, 1.00000001, 1000000000, Infinity, NaN])('rejects unsafe amount %s', value => {
    expect(financeAmountSchema.safeParse(value).success).toBe(false);
    expect(() => normalizeFinanceAmount(value)).toThrow();
  });
});
