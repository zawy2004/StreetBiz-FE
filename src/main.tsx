import '@/store/theme-store';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppErrorBoundary } from '@/components/feedback';
import { initInstallState, registerServiceWorker } from '@/core/pwa';
import { reloadOnStaleChunk } from '@/core/routing/chunk-reload';
import { App } from './App';
import './index.css';

reloadOnStaleChunk();
// Installable to the home screen (iOS/Android): the install event can fire before any screen mounts.
initInstallState();
registerServiceWorker();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
