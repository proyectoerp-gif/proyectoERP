import { describe, expect, it } from 'vitest';
import { assertDemoAllowed, assertEnvironmentSafety } from '../src/config/environmentSafety.js';

const production = {
  ERP_ENVIRONMENT: 'production' as const, MONGODB_DB_NAME: 'erp_production',
  MONGODB_URI: 'mongodb://localhost', JWT_SECRET: 'x'.repeat(64),
  API_URL: 'https://erp-real-api.onrender.com/api/v1', CORS_ORIGIN: 'https://erp-real-web.onrender.com'
};
describe('Separación de entornos', () => {
  it('acepta configuración independiente de producción', () => expect(() => assertEnvironmentSafety(production)).not.toThrow());
  it.each(['erp_app', 'erp_universal', ''])('rechaza producción sobre base %s', database => {
    expect(() => assertEnvironmentSafety({ ...production, MONGODB_DB_NAME: database })).toThrow();
  });
  it.each(['demo', 'development', 'test'] as const)('impide que %s abra producción', environment => {
    expect(() => assertEnvironmentSafety({ ...production, ERP_ENVIRONMENT: environment })).toThrow();
  });
  it.each(['http://localhost:4000', 'https://proyectoerp-addi.onrender.com/api/v1', '*'])('rechaza URL insegura o demo %s', url => {
    expect(() => assertEnvironmentSafety({ ...production, API_URL: url })).toThrow();
    expect(() => assertEnvironmentSafety({ ...production, CORS_ORIGIN: url })).toThrow();
  });
  it('exige secretos y conexión explícitos', () => {
    expect(() => assertEnvironmentSafety({ ...production, JWT_SECRET: undefined })).toThrow();
    expect(() => assertEnvironmentSafety({ ...production, MONGODB_URI: undefined })).toThrow();
  });
  it('bloquea la inicialización ficticia en producción', () => {
    expect(() => assertDemoAllowed('production')).toThrow();
    expect(() => assertDemoAllowed('demo')).not.toThrow();
  });
});
