export type FulfillmentOrder = {
  id: string;
  channel: 'E-commerce' | 'Retail' | 'Wholesale';
  status: 'picked' | 'packed' | 'shipped';
  etaDays: number | null;
};

export type OrderFulfillmentSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    fulfillmentRate: number | null;
    onTimeDelivery: number | null;
    inventoryCoverage: number | null;
  };
  orders: FulfillmentOrder[];
};

export function getOrderFulfillmentSummary(): OrderFulfillmentSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "fulfillmentRate": null,
    "onTimeDelivery": null,
    "inventoryCoverage": null
  },
  "orders": []
};
}
