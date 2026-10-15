export type DeploymentEnvironment = 'development' | 'test' | 'demo' | 'production';

type DeploymentConfig = {
  ERP_ENVIRONMENT: DeploymentEnvironment;
  MONGODB_DB_NAME: string;
  MONGODB_URI?: string;
  JWT_SECRET?: string;
  API_URL: string;
  CORS_ORIGIN: string;
};

// Validate before opening a connection. NODE_ENV=production also applies to demo hosting.
export function assertEnvironmentSafety(config: DeploymentConfig): void {
  const productionDatabase = config.MONGODB_DB_NAME === 'erp_production';
  if (config.ERP_ENVIRONMENT !== 'production') {
    if (productionDatabase) throw new Error('erp_production requiere ERP_ENVIRONMENT=production.');
    return;
  }
  if (!productionDatabase) throw new Error('Producción requiere una base independiente llamada erp_production.');
  if (!config.MONGODB_URI || !config.JWT_SECRET) throw new Error('Producción requiere conexión y secreto propios.');
  for (const value of [config.API_URL, config.CORS_ORIGIN]) {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error('Producción requiere URLs HTTPS explícitas.'); }
    if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
      ['proyectoerp-addi.onrender.com', 'proyectoerp-web.onrender.com'].includes(url.hostname)) {
      throw new Error('Producción requiere URLs HTTPS diferentes del entorno demo.');
    }
  }
}

export function assertDemoAllowed(environment: DeploymentEnvironment): void {
  if (environment === 'production') throw new Error('El alta ficticia está deshabilitada en producción.');
}
