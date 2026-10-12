import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/', 'prisma/', 'scripts/', '**/*.config.ts']
    },
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@routes': path.resolve(__dirname, 'src/routes'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@adapters': path.resolve(__dirname, 'src/adapters'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@middleware': path.resolve(__dirname, 'src/middleware'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@common': path.resolve(__dirname, '../../../common/types')
    }
  }
});