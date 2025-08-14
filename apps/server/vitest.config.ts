import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/controllers': path.resolve(__dirname, './src/controllers'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/middleware': path.resolve(__dirname, './src/middleware'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/prisma': path.resolve(__dirname, './src/prisma'),
    },
  },
});