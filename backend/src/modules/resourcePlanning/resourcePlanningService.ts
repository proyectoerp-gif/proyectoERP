export type ResourceAssignment = {
  name: string;
  role: string;
  allocation: number | null;
  utilization: number | null;
  project: string;
};

export type ResourcePlanningSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    capacityUtilization: number | null;
    workloadBalance: number | null;
    projectCoverage: number | null;
  };
  resources: ResourceAssignment[];
};

export function getResourcePlanningSummary(): ResourcePlanningSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "capacityUtilization": null,
    "workloadBalance": null,
    "projectCoverage": null
  },
  "resources": []
};
}
