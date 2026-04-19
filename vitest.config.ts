import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    // `pool: 'forks'` évite un bug `[vitest-worker]: Timeout calling "fetch"`
    // intermittent sur Windows quand plusieurs suites utilisent MSW en
    // parallèle dans les workers-threads.
    pool: 'forks',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**', '**/playwright/**'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/**', 'dist/**', 'tests/**', '**/*.config.{ts,js}', '**/*.d.ts'],
      thresholds: {
        lines: 12,
        statements: 12,
        functions: 39,
        branches: 79,
      },
    },
  },
});
