export type ComplianceControl = {
  name: string;
  status: 'passed' | 'warning' | 'review';
  coverage: number | null;
};

export type ComplianceSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    policyCoverage: number | null;
    controlCount: number | null;
    remediationDue: number | null;
  };
  controls: ComplianceControl[];
};

export function getComplianceSummary(): ComplianceSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "policyCoverage": null,
    "controlCount": null,
    "remediationDue": null
  },
  "controls": []
};
}
