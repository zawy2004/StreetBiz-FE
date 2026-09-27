import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type { FeeItemDto, FinanceCheckoutDto, PaymentTransactionDto } from '@/core/api';

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  apiGet: client.apiGet,
  apiPost: client.apiPost,
}));
vi.mock('@/features/orders/payment-redirect', () => ({ redirectToPayment: redirect }));
vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));

const { financeApi, wardReportApi } = await import('@/core/api/finance-api');
const { FeePaymentScreen } = await import('@/features/fee-schedules/screens/FeePaymentScreen');
const { PaymentHistoryScreen } = await import('@/features/fee-schedules/screens/PaymentHistoryScreen');
const { CollectionReportScreen } = await import(
  '@/features/ward-administration/screens/CollectionReportScreen'
);

const fee: FeeItemDto = {
  feeItemId: 3,
  contractId: 1,
  slotCode: 'NVL-01',
  periodLabel: 'Kỳ 3/3 · Tháng 10/2026',
  dueDate: '2026-10-20',
  amount: 1_040_000,
  itemStatus: 'PENDING',
  paidAt: null,
};

const checkout: FinanceCheckoutDto = {
  transactionId: 9,
  purpose: 'RENTAL_FEE',
  referenceId: 3,
  provider: 'MOMO',
  amount: 1_040_000,
  paymentUrl: 'streetbiz://payment/sandbox/momo?referenceId=3&transactionId=9',
};

/** What a real, configured provider (MoMo with Payments:Momo:* set) returns instead. */
const realCheckout: FinanceCheckoutDto = {
  ...checkout,
  paymentUrl: 'https://test-payment.momo.vn/v2/gateway/pay/abc123',
};

function renderAt(path: string, routes: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/finance', path]} initialIndex={1}>
        <Routes>
          <Route path="/vendor/finance" element={<p>FINANCE HOME</p>} />
          {routes}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const renderFeePayment = () =>
  renderAt(
    '/vendor/finance/fees/3/payment',
    <Route path="/vendor/finance/fees/:id/payment" element={<FeePaymentScreen />} />,
  );

const payButton = () => screen.findByRole('button', { name: /Thanh toán qua MoMo/ });

describe('finance API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends filters only when set and the Idempotency-Key as a header', async () => {
    client.apiGet.mockResolvedValue([]);
    client.apiPost.mockResolvedValue(checkout);

    await financeApi.fees('OVERDUE');
    await financeApi.fees();
    await financeApi.payFeeCheckout(3, 'ZALOPAY', 'key-1');
    await wardReportApi.collectionReport('2026-09-01', '2026-09-30');
    await wardReportApi.collectionReport();

    expect(client.apiGet.mock.calls.map(([path]) => path)).toEqual([
      '/vendor/finance/fees?status=OVERDUE',
      '/vendor/finance/fees',
      '/ward/reports/collection?from=2026-09-01&to=2026-09-30',
      '/ward/reports/collection',
    ]);
    expect(client.apiPost).toHaveBeenCalledWith(
      '/vendor/finance/fees/3/checkout',
      { provider: 'ZALOPAY' },
      { headers: { 'Idempotency-Key': 'key-1' } },
    );
  });
});

describe('fee payment (live API)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue([fee]);
  });

  it('confirms through the development sandbox and returns to FinanceHome instead of redirecting', async () => {
    client.apiPost.mockImplementation(async (url: string) =>
      url.endsWith('/checkout') ? checkout : { outcome: 'APPLIED', callbackEventId: 1 },
    );
    renderFeePayment();

    await userEvent.click(await payButton());

    expect(await screen.findByText('FINANCE HOME')).toBeInTheDocument();
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/payments/9/sandbox-confirm');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects straight to a real provider URL, never attempting sandbox-confirm', async () => {
    client.apiPost.mockResolvedValue(realCheckout);
    renderFeePayment();

    await userEvent.click(await payButton());

    await waitFor(() => expect(redirect).toHaveBeenCalledWith(realCheckout.paymentUrl));
    expect(client.apiPost).not.toHaveBeenCalledWith(
      expect.stringContaining('sandbox-confirm'),
    );
  });

  it('retries a failed checkout with the same Idempotency-Key so the server can replay it', async () => {
    client.apiPost
      .mockRejectedValueOnce(new ApiError('network_error', 0, 'Mất kết nối'))
      .mockImplementation(async (url: string) =>
        url.endsWith('/checkout') ? checkout : { outcome: 'APPLIED', callbackEventId: 1 },
      );
    renderFeePayment();

    await userEvent.click(await payButton());
    expect(await screen.findByText('Mất kết nối')).toBeInTheDocument();
    await userEvent.click(await payButton());
    await screen.findByText('FINANCE HOME');

    const checkoutKeys = client.apiPost.mock.calls
      .filter(([url]) => String(url).endsWith('/checkout'))
      .map(([, , config]) => config.headers['Idempotency-Key']);
    expect(checkoutKeys).toHaveLength(2);
    expect(checkoutKeys[0]).toBe(checkoutKeys[1]);
  });
});

describe('payment history', () => {
  beforeEach(() => vi.clearAllMocks());

  it('names the instalment and shows provider, slot and date', async () => {
    const row: PaymentTransactionDto = {
      transactionId: 5,
      purpose: 'RENTAL_FEE',
      provider: 'ZALOPAY',
      amount: 1_040_000,
      transactionStatus: 'SUCCESS',
      referenceLabel: 'Kỳ 3/3 · Tháng 10/2026',
      slotCode: 'NVL-01',
      createdAt: '2026-09-22T01:48:19Z',
      callbackReceivedAt: '2026-09-22T01:49:00Z',
    };
    client.apiGet.mockResolvedValue([row]);

    renderAt('/vendor/finance/payments', <Route path="/vendor/finance/payments" element={<PaymentHistoryScreen />} />);

    expect(await screen.findByText('Kỳ 3/3 · Tháng 10/2026')).toBeInTheDocument();
    // The time part depends on the test machine's time zone; the date and everything else do not.
    expect(screen.getByText(/^Phí thuê ô · NVL-01 · ZaloPay · .*22\/09\/2026$/)).toBeInTheDocument();
  });
});

describe('ward collection report', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('asks for the selected period in local calendar days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    client.apiGet.mockResolvedValue({
      from: '2026-10-01',
      to: '2026-10-05',
      feeCollected: 0,
      feePending: 0,
      feeOverdue: 0,
      penaltyCollected: 0,
      penaltyPending: 0,
      invoiceCount: 0,
      recentViolations: [],
    });

    renderAt('/ward/reports', <Route path="/ward/reports" element={<CollectionReportScreen />} />);
    await screen.findByText('Phí đã thu');
    await userEvent.click(screen.getByRole('tab', { name: 'Tháng trước' }));
    await userEvent.click(screen.getByRole('tab', { name: '90 ngày' }));

    await waitFor(() =>
      expect(client.apiGet.mock.calls.map(([path]) => path)).toEqual([
        '/ward/reports/collection?from=2026-10-01&to=2026-10-05',
        '/ward/reports/collection?from=2026-09-01&to=2026-09-30',
        '/ward/reports/collection?from=2026-07-08&to=2026-10-05',
      ]),
    );
  });
});
