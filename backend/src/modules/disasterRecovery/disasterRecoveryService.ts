export type RecoveryPlan = {
  name: string;
  backupStatus: 'not_configured';
  rpo: null;
  rto: null;
};

export type DisasterRecoverySummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    recoveryReadiness: null;
    backupCoverage: null;
    lastTest: null;
  };
  plans: RecoveryPlan[];
};

// Local manual drills do not establish a monitored policy for this deployment.
export function getDisasterRecoverySummary(): DisasterRecoverySummary {
  return {
    service: 'erp-api',
    status: 'not_configured',
    metrics: {
      recoveryReadiness: null,
      backupCoverage: null,
      lastTest: null
    },
    plans: [
      { name: 'Core ERP', backupStatus: 'not_configured', rpo: null, rto: null },
      { name: 'Finance', backupStatus: 'not_configured', rpo: null, rto: null },
      { name: 'Warehouse', backupStatus: 'not_configured', rpo: null, rto: null }
    ]
  };
}
