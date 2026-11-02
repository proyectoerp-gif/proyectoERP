export type MaintenanceWorkOrder = {
  asset: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  hours: number | null;
};

export type MaintenancePlanningSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    preventiveCoverage: number | null;
    riskIndex: number | null;
    plannedHours: number | null;
    estimatedUptime: number | null;
  };
  nextMaintenanceWindow: string;
  workOrders: MaintenanceWorkOrder[];
};

export function getMaintenancePlanningSummary(): MaintenancePlanningSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "preventiveCoverage": null,
    "riskIndex": null,
    "plannedHours": null,
    "estimatedUptime": null
  },
  "nextMaintenanceWindow": "",
  "workOrders": []
};
}
