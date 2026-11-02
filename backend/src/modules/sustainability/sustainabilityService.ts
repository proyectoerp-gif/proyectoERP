export type SustainabilityProgram = {
  name: string;
  status: 'active' | 'monitoring' | 'planned';
  target: number | null;
};

export type SustainabilitySummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    carbonIntensity: number | null;
    recyclingRate: number | null;
    energyEfficiency: number | null;
  };
  programs: SustainabilityProgram[];
};

export function getSustainabilitySummary(): SustainabilitySummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "carbonIntensity": null,
    "recyclingRate": null,
    "energyEfficiency": null
  },
  "programs": []
};
}
