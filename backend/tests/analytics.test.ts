import { describe, expect, it } from 'vitest';

import { getAnalyticsOverview } from '../src/modules/analytics/analyticsService.js';

describe('analytics domain', () => {
  it('should expose the ERP analytics overview and conversion trends', () => {
    const overview = getAnalyticsOverview();

    expect(overview.service).toBe('erp-api');
    expect(overview.status).toBe('not_configured');
    expect(overview.channels).toEqual([]);
    expect(overview.trends).toEqual([]);
    expect(overview.kpis).toEqual({ totalRevenue: null, conversionRate: null, activeCustomers: null });
  });
});
