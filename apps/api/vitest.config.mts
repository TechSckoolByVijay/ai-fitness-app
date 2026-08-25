import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Integration tests share one Postgres test DB — run serially to avoid
    // cross-test row collisions (unique-email conflicts, count assertions).
    fileParallelism: false,
  },
});
