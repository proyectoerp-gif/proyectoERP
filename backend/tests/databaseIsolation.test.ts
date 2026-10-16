import { describe, expect, it } from 'vitest';
import { assertProductionDatabaseIsolation } from '../src/config/databaseIsolation.js';

describe('Permisos efectivos de producción en Atlas', () => {
  it.each([
    { code: 13 },
    { code: 8000, message: 'not authorized on erp_app to execute command' },
    { code: 8000, message: 'user is not allowed to do action [find]' }
  ])('acepta únicamente autorización denegada: %j', async failure => {
    await expect(assertProductionDatabaseIsolation(async () => { throw failure; })).resolves.toBeUndefined();
  });
  it('rechaza usuarios que pueden leer demo aunque la colección esté vacía', async () => {
    await expect(assertProductionDatabaseIsolation(async () => null)).rejects.toThrow('tiene acceso');
  });
  it.each([new Error('timeout'), { code: 8000, message: 'connection failed' }, null])('no confunde fallos con aislamiento', async failure => {
    await expect(assertProductionDatabaseIsolation(async () => { throw failure; })).rejects.toThrow('No se pudo verificar');
  });
});
