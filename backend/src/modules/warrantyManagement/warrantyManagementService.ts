export type WarrantyClaim = {
  asset: string;
  status: 'open' | 'approved' | 'closed';
  replacementCost: number | null;
  coverage: number | null;
};

export type WarrantyManagementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    claimsRate: number | null;
    coverageRate: number | null;
    replacementRate: number | null;
  };
  claims: WarrantyClaim[];
};

export function getWarrantyManagementSummary(): WarrantyManagementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "claimsRate": null,
    "coverageRate": null,
    "replacementRate": null
  },
  "claims": []
};
}
