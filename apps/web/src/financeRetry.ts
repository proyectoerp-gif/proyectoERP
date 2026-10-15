import { createFinanceRetry, financeRetryScope } from '../../../shared/utils/financeRetry';
export { financeRetryScope };
function accessStorage<T>(work: () => T): T {
  try { return work(); } catch {
    throw new Error('No se pudo conservar la operación en este navegador. Revisa el movimiento y el almacenamiento del navegador antes de reintentar.');
  }
}
export const financeRetry = createFinanceRetry({
  read: async name => accessStorage(() => localStorage.getItem(name)),
  write: async (name, value) => { accessStorage(() => localStorage.setItem(name, value)); },
  remove: async name => { accessStorage(() => localStorage.removeItem(name)); }
}, () => crypto.randomUUID());
