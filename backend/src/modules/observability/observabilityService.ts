export type ObservableAlert = {
  level: 'info' | 'warning' | 'critical';
  message: string;
};

export type ObservabilitySummary = {
  service: string;
  status: 'partial';
  metrics: {
    uptimeSeconds: number;
    memoryUsageMb: number;
    requestRatePerMinute: null;
    errorRate: null;
  };
  alerts: ObservableAlert[];
};

const startedAt = Date.now();

export function getObservabilitySummary(): ObservabilitySummary {
  return {
    service: 'erp-api',
    status: 'partial',
    metrics: {
      uptimeSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      requestRatePerMinute: null,
      errorRate: null
    },
    alerts: [
      { level: 'info', message: 'Uptime and memory describe this process only.' },
      { level: 'warning', message: 'Request and error rates are not instrumented. Consult /health/ready for database readiness.' }
    ]
  };
}
