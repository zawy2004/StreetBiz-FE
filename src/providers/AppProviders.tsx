import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ToastHost } from '@/components/feedback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      // Moving between tabs no longer re-downloads what was fetched moments ago.
      // Mutations still invalidate their queries, and live screens (orders,
      // complaints) poll with their own refetchInterval.
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
