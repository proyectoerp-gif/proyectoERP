// Client bookkeeping only. The server independently authenticates every replay.
export interface FinanceRetryStorage {
  read(name: string): Promise<string | null>;
  write(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
}
function digest(value: string): string {
  // Storage addressing, not authentication or a cryptographic integrity check.
  return [2166136261, 2246822507, 3266489909, 668265263].map(seed => {
    let hash = seed;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }).join('');
}
export function financeRetryScope(base: string, token: string): string {
  try {
    const encoded = token.split('.')[1];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let bits = 0, count = 0, bytes = '';
    for (const character of encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')) {
      const value = alphabet.indexOf(character);
      if (value < 0) throw new Error();
      bits = (bits << 6) | value; count += 6;
      if (count >= 8) { count -= 8; bytes += '%' + ((bits >>> count) & 255).toString(16).padStart(2, '0'); }
    }
    const claims = JSON.parse(decodeURIComponent(bytes));
    if (![claims.sub, claims.companyId, claims.branchId].every(value => typeof value === 'string' && value.length > 0)) throw new Error();
    return JSON.stringify([base.replace(/\/+$/, ''), claims.sub, claims.companyId, claims.branchId]);
  } catch { throw new Error('La sesión no permite identificar la operación. Vuelve a iniciar sesión.'); }
}
export function createFinanceRetry(storage: FinanceRetryStorage, randomKey = () =>
  `finance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`) {
  let queue: Promise<unknown> = Promise.resolve();
  const nameFor = (scope: string, payload: Record<string, unknown>) => 'erp-finance-v1-' + digest(scope + JSON.stringify(
    Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)))));
  function exclusive<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.then(work);
    queue = next.catch(() => undefined);
    return next;
  }
  return {
    key(scope: string, payload: Record<string, unknown>) {
      return exclusive(async () => {
        const name = nameFor(scope, payload);
        const existing = await storage.read(name);
        if (existing !== null) {
          if (!/^[a-zA-Z0-9_-]{16,100}$/.test(existing)) throw new Error('No se pudo recuperar el identificador pendiente. Revisa el movimiento antes de continuar.');
          return existing;
        }
        const key = randomKey();
        await storage.write(name, key); // Persist BEFORE sending. Fail closed if storage is unavailable.
        return key;
      });
    },
    confirmed(scope: string, payload: Record<string, unknown>, key: string) {
      return exclusive(async () => {
        const name = nameFor(scope, payload);
        if (await storage.read(name) === key) await storage.remove(name);
      });
    }
  };
}
