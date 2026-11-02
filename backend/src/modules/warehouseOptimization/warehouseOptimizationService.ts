export type WarehouseLocation = {
  zone: 'Zone A' | 'Zone B' | 'Zone C';
  utilization: number | null;
  travelDistance: number | null;
};

export type WarehouseOptimizationSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    slotUtilization: number | null;
    travelDistance: number | null;
    pickAccuracy: number | null;
  };
  locations: WarehouseLocation[];
};

export function getWarehouseOptimizationSummary(): WarehouseOptimizationSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "slotUtilization": null,
    "travelDistance": null,
    "pickAccuracy": null
  },
  "locations": []
};
}
