import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Force mock mode so rendering a screen never reaches for StreetBiz-BE:
    // tests must not depend on a running API, and jsdom cannot satisfy CORS.
    env: {
      VITE_USE_MOCK_API: 'true',
      VITE_API_BASE_URL: 'http://localhost:5000/api',
    },
  },
});
