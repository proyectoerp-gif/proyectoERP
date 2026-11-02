export type Vendor = {
  name: string;
  health: 'healthy' | 'watch' | 'risk';
  score: number | null;
  onboarding: string;
};

export type VendorManagementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    activeVendors: number | null;
    avgPerformance: number | null;
    dueReviews: number | null;
  };
  vendors: Vendor[];
};

export function getVendorManagementSummary(): VendorManagementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "activeVendors": null,
    "avgPerformance": null,
    "dueReviews": null
  },
  "vendors": []
};
}
