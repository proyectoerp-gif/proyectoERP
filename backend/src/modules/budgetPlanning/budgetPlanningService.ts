export type BudgetDepartment = {
  name: string;
  planned: number | null;
  actual: number | null;
  variance: number | null;
};

export type BudgetPlanningSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    forecastVariance: number | null;
    burnRate: number | null;
    coverage: number | null;
  };
  departments: BudgetDepartment[];
};

export function getBudgetPlanningSummary(): BudgetPlanningSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "forecastVariance": null,
    "burnRate": null,
    "coverage": null
  },
  "departments": []
};
}
