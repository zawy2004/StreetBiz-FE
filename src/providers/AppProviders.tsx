import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ToastHost } from '@/components/feedback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Data older than staleTime is fetched again when the tab is focused or the network
      // comes back, so a tab left open never stays stale for long. Moving between screens
      // within staleTime still re-downloads nothing. Mutations invalidate their queries;
      // live screens poll (core/config/refresh.ts) or use push (orders, chat).
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 30_000,
    },
  },
});

type Props = { children: ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastHost />
    </QueryClientProvider>
  );
}
