export type PartnerStatus = 'healthy' | 'watch' | 'at-risk';

export type Partner = {
  name: string;
  status: PartnerStatus;
  access: 'full' | 'limited';
  performanceScore: number | null;
};

export type PartnerPortalSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    activePartners: number | null;
    healthRate: number | null;
    sharedOrders: number | null;
  };
  partners: Partner[];
};

export function getPartnerPortalSummary(): PartnerPortalSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "activePartners": null,
    "healthRate": null,
    "sharedOrders": null
  },
  "partners": []
};
}
