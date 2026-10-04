import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const dashboardState = vi.hoisted(() => ({
  value: {
    dashboard: undefined as unknown,
    isLoading: false,
    isError: true,
    error: new Error('500'),
    refetch: vi.fn(),
  },
}));

vi.mock('@/features/ward-administration/useWardReports', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/ward-administration/useWardReports')>();
  return { ...actual, useWardDashboard: () => dashboardState.value };
});

const { WardDashboardScreen } =
  await import('@/features/ward-administration/screens/WardDashboardScreen');

describe('WardDashboardScreen', () => {
  it('reports a failed load with a retry instead of spinning forever', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <WardDashboardScreen />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Không tải được dữ liệu')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải…')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(dashboardState.value.refetch).toHaveBeenCalledTimes(1);
  });
});
