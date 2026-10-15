export type AnalyticsTrend = {
  name: 'conversion' | 'retention' | 'traffic';
  value: number;
  period: string;
};

export type AnalyticsChannel = {
  name: string;
  sessions: number;
  conversionRate: number;
};

export type AnalyticsOverview = {
  service: string;
  status: 'not_configured';
  channels: AnalyticsChannel[];
  trends: AnalyticsTrend[];
  kpis: {
    totalRevenue: null;
    conversionRate: null;
    activeCustomers: null;
  };
};

export function getAnalyticsOverview(): AnalyticsOverview {
  return {
    service: 'erp-api',
    status: 'not_configured',
    channels: [],
    trends: [],
    kpis: {
      totalRevenue: null,
      conversionRate: null,
      activeCustomers: null
    }
  };
}
