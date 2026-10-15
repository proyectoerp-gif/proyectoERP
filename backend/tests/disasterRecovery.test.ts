import { describe, expect, it } from 'vitest';

import { getDisasterRecoverySummary } from '../src/modules/disasterRecovery/disasterRecoveryService.js';

describe('disaster recovery domain', () => {
  it('does not claim recovery readiness without monitored evidence', () => {
    const summary = getDisasterRecoverySummary();

    expect(summary.service).toBe('erp-api');
    expect(summary.status).toBe('not_configured');
    expect(summary.metrics).toEqual({ recoveryReadiness: null, backupCoverage: null, lastTest: null });
    expect(summary.plans.every(plan => plan.backupStatus === 'not_configured' && plan.rpo === null && plan.rto === null)).toBe(true);
    expect(summary.plans.length).toBeGreaterThan(0);
    expect(summary.plans.some((plan) => plan.name === 'Core ERP')).toBe(true);
  });
});
