export type ProcurementOrder = {
  supplier: string;
  status: 'pending' | 'in_transit' | 'received';
  leadTimeDays: number | null;
  spend: number | null;
};

export type ProcurementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    supplierScore: number | null;
    leadTime: number | null;
    spendCoverage: number | null;
  };
  orders: ProcurementOrder[];
};

export function getProcurementSummary(): ProcurementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "supplierScore": null,
    "leadTime": null,
    "spendCoverage": null
  },
  "orders": []
};
}
