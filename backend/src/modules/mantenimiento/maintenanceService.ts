export type MaintenanceAsset = {
  name: string;
  status: 'running' | 'scheduled' | 'warning';
  nextService: string;
  criticality: 'low' | 'medium' | 'high';
};

export type MaintenanceSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    availability: number | null;
    preventiveRate: number | null;
    downtimeRisk: number | null;
  };
  assets: MaintenanceAsset[];
};

export function getMaintenanceSummary(): MaintenanceSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "availability": null,
    "preventiveRate": null,
    "downtimeRisk": null
  },
  "assets": []
};
}
