export type ReturnItem = {
  id: string;
  reason: 'Damaged in transit' | 'Customer preference' | 'Quality issue';
  quantity: number | null;
  recoveryValue: number | null;
};

export type ReturnsManagementSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    returnRate: number | null;
    recoveryRate: number | null;
    reverseLogisticsHealth: number | null;
  };
  items: ReturnItem[];
};

export function getReturnsManagementSummary(): ReturnsManagementSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "returnRate": null,
    "recoveryRate": null,
    "reverseLogisticsHealth": null
  },
  "items": []
};
}
