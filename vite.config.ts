import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * A production build without an API address does not fail on its own: the app
 * quietly switches to its built-in demo data (isLiveApi is false), so a missing
 * Vercel variable ships a site that looks fine and talks to nothing. Refuse it.
 */
function checkProductionEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.VITE_USE_MOCK_API === 'true') return;

  const apiBase = env.VITE_API_BASE_URL?.trim();
  if (!apiBase) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Point it at the deployed API (https://<app>.azurewebsites.net/api), ' +
        'or set VITE_USE_MOCK_API=true for a demo build with no backend.',
    );
  }

  // On Vercel a localhost or plain-http API is always a copied .env, never intended:
  // browsers block http calls from an https page.
  if (process.env.VERCEL) {
    const url = new URL(apiBase);
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname)) {
      throw new Error(`VITE_API_BASE_URL must be the deployed https API on Vercel, not ${apiBase}.`);
    }
    if (env.VITE_APP_ENV === 'development') {
      console.warn(
        '[streetbiz] VITE_APP_ENV=development on Vercel: the sign-in page will list the demo ' +
          'accounts and their password. Leave it unset (or "production") for a public site.',
      );
    }
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') checkProductionEnv(mode);

  return {
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
  };
});
