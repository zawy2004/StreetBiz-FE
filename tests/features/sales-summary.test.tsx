import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { orderApi } from '@/features/orders/api/orderApi';
import { SalesSummaryScreen } from '@/features/storefronts/screens/SalesSummaryScreen';

function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <SalesSummaryScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('sales summary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the net figure once, and a quick range asks the server once', async () => {
    const summary = vi.spyOn(orderApi, 'salesSummary').mockResolvedValue({
      fromDate: '',
      toDate: '',
      groupBy: 'day',
      completedOrderCount: 2,
      grossSales: 80_000,
      refundedAmount: 20_000,
      netSales: 60_000,
      buckets: [
        {
          key: '2026-09-30',
          completedOrderCount: 2,
          grossSales: 80_000,
          refundedAmount: 20_000,
          netSales: 60_000,
        },
      ],
    });
    mount();

    await screen.findByText('2 đơn hoàn thành', { exact: false });
    expect(screen.getAllByText('Doanh thu thuần')).toHaveLength(1);
    expect(screen.getByText('25% doanh thu gộp')).toBeInTheDocument();
    expect(summary).toHaveBeenCalledTimes(1);
    expect(summary.mock.calls[0]![2]).toBe('day');

    fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));
    await waitFor(() => expect(summary).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: '7 ngày' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not ask the server when the range is backwards', async () => {
    const summary = vi.spyOn(orderApi, 'salesSummary').mockResolvedValue({
      fromDate: '',
      toDate: '',
      groupBy: 'day',
      completedOrderCount: 0,
      grossSales: 0,
      refundedAmount: 0,
      netSales: 0,
      buckets: [],
    });
    mount();
    await screen.findByText('Chưa có đơn hoàn tất trong khoảng này');

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2099-01-01' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Từ ngày không được sau đến ngày.');
    expect(summary).toHaveBeenCalledTimes(1);
  });
});
