import { defineConfig } from 'vitest/config';

/** npm run sim: the balance simulator, kept out of the normal test run. */
export default defineConfig({
  test: { include: ['scripts/sim.sim.ts'], environment: 'node', testTimeout: 600_000 },
});
