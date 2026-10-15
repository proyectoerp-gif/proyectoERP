import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  include: ['tests/stock.integration.ts', 'tests/access.integration.ts'],
  fileParallelism: false,
  testTimeout: 60000,
  hookTimeout: 60000
} });
