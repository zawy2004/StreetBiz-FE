import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    watch: {
      // Visual Studio's IntelliSense index (.vs/) locks its files on Windows;
      // letting chokidar watch it races with VS and crashes the dev server
      // with EBUSY.
      ignored: ['**/.vs/**'],
    },
  },
});
