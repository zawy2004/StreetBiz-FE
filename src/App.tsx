import { BrowserRouter } from 'react-router-dom';

import { AppProviders } from '@/providers/AppProviders';
import { AppRouter } from '@/router';
import { AssistantHost } from '@/features/assistant/AssistantHost';

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
        <AssistantHost />
      </AppProviders>
    </BrowserRouter>
  );
}
