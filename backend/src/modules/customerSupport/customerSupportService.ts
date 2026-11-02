export type SupportTeam = {
  name: string;
  queue: 'Tier 1' | 'Tier 2' | 'Escalations';
  utilization: number | null;
  sla: number | null;
};

export type CustomerSupportSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    openTickets: number | null;
    slaCompliance: number | null;
    backlogRisk: number | null;
  };
  supportTeams: SupportTeam[];
};

export function getCustomerSupportSummary(): CustomerSupportSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "openTickets": null,
    "slaCompliance": null,
    "backlogRisk": null
  },
  "supportTeams": []
};
}
