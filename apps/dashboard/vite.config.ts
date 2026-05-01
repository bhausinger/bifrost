/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3333,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
