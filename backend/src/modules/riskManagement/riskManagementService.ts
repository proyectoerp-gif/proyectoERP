export type RiskItem = {
  name: string;
  level: 'low' | 'medium' | 'high';
  exposure: number | null;
  mitigation: number | null;
};

export type RiskManagementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    totalExposure: number | null;
    mitigationRate: number | null;
    criticalRisks: number | null;
  };
  risks: RiskItem[];
};

export function getRiskManagementSummary(): RiskManagementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "totalExposure": null,
    "mitigationRate": null,
    "criticalRisks": null
  },
  "risks": []
};
}
