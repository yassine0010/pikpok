import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Test files share one database and setup.ts wipes the users table per
    // file, so files must not execute concurrently.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
