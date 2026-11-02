export type FleetVehicle = {
  plate: string;
  status: 'available' | 'route' | 'maintenance';
  utilization: number | null;
  nextService: string;
};

export type FleetManagementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    utilization: number | null;
    routeEfficiency: number | null;
    maintenanceReadiness: number | null;
  };
  vehicles: FleetVehicle[];
};

export function getFleetManagementSummary(): FleetManagementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "utilization": null,
    "routeEfficiency": null,
    "maintenanceReadiness": null
  },
  "vehicles": []
};
}
