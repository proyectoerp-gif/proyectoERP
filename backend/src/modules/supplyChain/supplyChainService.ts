export type SupplyChainNode = {
  name: string;
  type: 'hub' | 'warehouse' | 'supplier';
  fulfillment: number | null;
  leadTime: number | null;
};

export type SupplyChainSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    fulfillmentRate: number | null;
    averageLeadTime: number | null;
    networkCoverage: number | null;
  };
  nodes: SupplyChainNode[];
};

export function getSupplyChainSummary(): SupplyChainSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "fulfillmentRate": null,
    "averageLeadTime": null,
    "networkCoverage": null
  },
  "nodes": []
};
}
