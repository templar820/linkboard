import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Nest.js полагается на decorator metadata (emitDecoratorMetadata), которую
// стандартный esbuild-транспайлер vitest не умеет генерировать корректно —
// поэтому обязателен unplugin-swc (см. sprints/11-08 задача T5).
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    root: '.',
  },
});
