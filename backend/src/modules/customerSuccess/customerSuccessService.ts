export type CustomerAccount = {
  name: string;
  stage: 'onboarding' | 'adopted' | 'expanding';
  health: 'healthy' | 'watch' | 'risk';
  nps: number | null;
};

export type CustomerSuccessSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    retentionRate: number | null;
    onboardingCompletion: number | null;
    atRiskAccounts: number | null;
  };
  accounts: CustomerAccount[];
};

export function getCustomerSuccessSummary(): CustomerSuccessSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "retentionRate": null,
    "onboardingCompletion": null,
    "atRiskAccounts": null
  },
  "accounts": []
};
}
