export type BusinessProcess = {
  name: string;
  coverage: number | null;
  backupReady: boolean;
  owner: string;
};

export type BusinessContinuitySummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    coverage: number | null;
    resilienceScore: number | null;
    reviewCycle: string | null;
  };
  processes: BusinessProcess[];
};

export function getBusinessContinuitySummary(): BusinessContinuitySummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "coverage": null,
    "resilienceScore": null,
    "reviewCycle": null
  },
  "processes": []
};
}
