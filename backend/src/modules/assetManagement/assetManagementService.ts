export type AssetRecord = {
  name: string;
  status: 'operational' | 'maintenance' | 'offline';
  utilization: number | null;
  downtime: number | null;
};

export type AssetManagementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    utilizationRate: number | null;
    downtimeRate: number | null;
    maintenanceCoverage: number | null;
  };
  assets: AssetRecord[];
};

export function getAssetManagementSummary(): AssetManagementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "utilizationRate": null,
    "downtimeRate": null,
    "maintenanceCoverage": null
  },
  "assets": []
};
}
