export type ContractStatus = 'active' | 'renewal' | 'expired';

export type ContractItem = {
  vendor: string;
  status: ContractStatus;
  coverage: number | null;
  renewalDate: string;
};

export type ContractManagementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    coverage: number | null;
    renewalRisk: number | null;
    compliant: number | null;
  };
  contracts: ContractItem[];
};

export function getContractManagementSummary(): ContractManagementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "coverage": null,
    "renewalRisk": null,
    "compliant": null
  },
  "contracts": []
};
}
