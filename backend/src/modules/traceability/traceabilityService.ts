export type TraceabilityEvent = {
  id: string;
  location: string;
  status: 'registered' | 'in_transit' | 'verified';
  compliance: number | null;
};

export type TraceabilitySummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    batchCoverage: number | null;
    serializationRate: number | null;
    complianceScore: number | null;
  };
  events: TraceabilityEvent[];
};

export function getTraceabilitySummary(): TraceabilitySummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "batchCoverage": null,
    "serializationRate": null,
    "complianceScore": null
  },
  "events": []
};
}
