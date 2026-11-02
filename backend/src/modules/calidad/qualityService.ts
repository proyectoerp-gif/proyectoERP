export type QualityInspection = {
  line: string;
  status: 'pass' | 'watch' | 'fail';
  defectRate: number | null;
  firstPass: number | null;
};

export type QualitySummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    firstPassYield: number | null;
    defectRate: number | null;
    compliance: number | null;
  };
  inspections: QualityInspection[];
};

export function getQualitySummary(): QualitySummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "firstPassYield": null,
    "defectRate": null,
    "compliance": null
  },
  "inspections": []
};
}
