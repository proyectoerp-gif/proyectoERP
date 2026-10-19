import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  include: ['tests/stock.integration.ts', 'tests/access.integration.ts', 'tests/demoSupport.integration.ts', 'tests/catalogLifecycle.integration.ts', 'tests/commercialItems.integration.ts', 'tests/demoCatalog.integration.ts'],
  fileParallelism: false,
  testTimeout: 60000,
  hookTimeout: 60000
} });
