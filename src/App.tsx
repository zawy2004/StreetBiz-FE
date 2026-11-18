import { BrowserRouter } from 'react-router-dom';

import { AppProviders } from '@/providers/AppProviders';
import { AppRouter } from '@/router';
import { AssistantHost } from '@/features/assistant/AssistantHost';
import { InstallAppBanner } from '@/components/pwa';

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
        <AssistantHost />
        <InstallAppBanner />
      </AppProviders>
    </BrowserRouter>
  );
}
