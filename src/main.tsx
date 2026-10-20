import '@/store/theme-store';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppErrorBoundary } from '@/components/feedback';
import { App } from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
