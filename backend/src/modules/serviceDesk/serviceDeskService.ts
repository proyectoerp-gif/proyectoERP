export type QueueStatus = {
  name: string;
  active: number | null;
  avgResponse: number | null;
  firstResponse: number | null;
};

export type ServiceDeskSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    activeIncidents: number | null;
    mttr: number | null;
    slaCompliance: number | null;
  };
  queues: QueueStatus[];
};

export function getServiceDeskSummary(): ServiceDeskSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "activeIncidents": null,
    "mttr": null,
    "slaCompliance": null
  },
  "queues": []
};
}
