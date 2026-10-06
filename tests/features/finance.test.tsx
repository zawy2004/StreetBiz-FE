import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type {
  FeeItemDetailDto,
  FeeItemDto,
  FinanceCheckoutDto,
  InvoiceDetailDto,
  PaymentTransactionDto,
} from '@/core/api';

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiGetBlob: vi.fn(), apiPost: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
const saveFile = vi.hoisted(() => vi.fn());

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  apiGet: client.apiGet,
  apiGetBlob: client.apiGetBlob,
  apiPost: client.apiPost,
}));
vi.mock('@/core/utils/save-file', () => ({ saveFile }));
vi.mock('@/features/orders/payment-redirect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/orders/payment-redirect')>()),
  redirectToPayment: redirect,
}));
vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));

const { financeApi, wardReportApi } = await import('@/core/api/finance-api');
const { FeePaymentScreen } = await import('@/features/fee-schedules/screens/FeePaymentScreen');
const { PaymentHistoryScreen } = await import('@/features/fee-schedules/screens/PaymentHistoryScreen');
const { InvoiceDetailScreen } = await import('@/features/fee-schedules/screens/InvoiceDetailScreen');
const { CollectionReportScreen } = await import(
  '@/features/ward-administration/screens/CollectionReportScreen'
);
const { WardDebtorsScreen } = await import('@/features/ward-administration/screens/WardDebtorsScreen');

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

/** The instalment as the server describes it, before and after it is paid. */
function feeDetail(paid: boolean): FeeItemDetailDto {
  const item = {
    feeItemId: 3,
    ordinal: 3,
    ofCount: 3,
    periodLabel: 'Kỳ 3/3 · Tháng 10/2026',
    dueDate: '2026-10-20',
    amount: 1_040_000,
    itemStatus: paid ? 'PAID' : 'PENDING',
    paidAt: paid ? '2026-10-02T04:00:00Z' : null,
    invoiceId: paid ? 4 : null,
    invoiceNumber: paid ? 'HD-2026-000004' : null,
    daysOverdue: null,
    daysUntilDue: paid ? null : 18,
  };
  return {
    contract: {
      contractId: 1,
      slotCode: 'NVL-01',
      zoneName: 'Nguyễn Văn Linh',
      wardName: 'Hải Châu 1',
      address: null,
      startDate: '2026-08-01',
      endDate: '2026-10-30',
      contractStatus: 'ACTIVE',
      totalAmount: 3_120_000,
      paidAmount: paid ? 3_120_000 : 2_080_000,
      outstandingAmount: paid ? 0 : 1_040_000,
      instalmentCount: 3,
      paidCount: paid ? 3 : 2,
      overdueCount: 0,
      nextDue: paid ? null : item,
    },
    item,
  };
}

describe('fee payment (live API)', () => {
  // The fake server: the instalment turns PAID once a confirmation (sandbox or MoMo sync) lands.
  let paid = false;
  beforeEach(() => {
    vi.clearAllMocks();
    paid = false;
    client.apiGet.mockImplementation(async (url: string) =>
      url === '/vendor/finance/fees/3' ? feeDetail(paid) : [fee],
    );
  });

  const confirmingServer = (confirmation: unknown = { outcome: 'APPLIED', callbackEventId: 1 }) =>
    client.apiPost.mockImplementation(async (url: string) => {
      if (url.endsWith('/checkout')) return checkout;
      paid = true;
      return confirmation;
    });

  it('shows what is being paid: the slot, the period, how urgent it is and the contract progress', async () => {
    renderFeePayment();

    expect(await screen.findByText('Phí thuê ô NVL-01')).toBeInTheDocument();
    // 18 days off is not yet "soon": the badge gives the date (the countdown starts at 7 days).
    expect(screen.getByText(/hạn 20\/10\/2026/i)).toBeInTheDocument();
    expect(screen.getByText('Hợp đồng đã nộp 2/3 kỳ')).toBeInTheDocument();
    expect(client.apiGet).toHaveBeenCalledWith('/vendor/finance/fees/3');
  });

  it('confirms through the development sandbox and shows the receipt with its invoice', async () => {
    confirmingServer();
    renderFeePayment();

    await userEvent.click(await payButton());

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(screen.getByText('HD-2026-000004')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem hoá đơn' })).toBeInTheDocument();
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/payments/9/sandbox-confirm');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('falls back to the payment gateway when there is no sandbox (404)', async () => {
    client.apiPost.mockImplementation(async (url: string) => {
      if (url.endsWith('/checkout')) return checkout;
      throw new ApiError('not_found', 404, 'Not found');
    });
    renderFeePayment();

    await userEvent.click(await payButton());

    await waitFor(() => expect(redirect).toHaveBeenCalledWith(checkout.paymentUrl));
  });

  it('goes to the MoMo page instead of the simulator when MoMo is configured', async () => {
    const momo = { ...checkout, paymentUrl: 'https://test-payment.momo.vn/v2/gateway/pay?t=abc' };
    client.apiPost.mockResolvedValue(momo);
    renderFeePayment();

    await userEvent.click(await payButton());

    await waitFor(() => expect(redirect).toHaveBeenCalledWith(momo.paymentUrl));
    expect(client.apiPost).not.toHaveBeenCalledWith('/vendor/finance/payments/9/sandbox-confirm');
  });

  it('checks with MoMo on return and shows the receipt once MoMo confirms', async () => {
    confirmingServer({ transactionId: 9, status: 'SUCCESS' });
    renderAt(
      '/vendor/finance/fees/3/payment?partnerCode=MOMO&orderId=SB-T9&resultCode=0',
      <Route path="/vendor/finance/fees/:id/payment" element={<FeePaymentScreen />} />,
    );

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/payments/9/sync');
  });

  it('reads the transaction from the per-attempt orderId MoMo sends back (SB-T{id}-{8 hex})', async () => {
    confirmingServer({ transactionId: 9, status: 'SUCCESS' });
    renderAt(
      '/vendor/finance/fees/3/payment?partnerCode=MOMO&orderId=SB-T9-3fa2b1c4&resultCode=0',
      <Route path="/vendor/finance/fees/:id/payment" element={<FeePaymentScreen />} />,
    );

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/payments/9/sync');
  });

  it('keeps the vendor on the page with a retry while MoMo has not confirmed yet', async () => {
    client.apiPost.mockResolvedValue({ transactionId: 9, status: 'PENDING' });
    renderAt(
      '/vendor/finance/fees/3/payment?orderId=SB-T9&resultCode=1000',
      <Route path="/vendor/finance/fees/:id/payment" element={<FeePaymentScreen />} />,
    );

    expect(await screen.findByText('MoMo chưa xác nhận thanh toán')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument();
  });

  it('retries a failed checkout with the same Idempotency-Key so the server can replay it', async () => {
    client.apiPost.mockRejectedValueOnce(new ApiError('network_error', 0, 'Mất kết nối'));
    renderFeePayment();
    await userEvent.click(await payButton());
    expect(await screen.findByText('Mất kết nối')).toBeInTheDocument();

    confirmingServer();
    await userEvent.click(await payButton());
    await screen.findByText('Thanh toán thành công');

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

describe('invoice download', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the receipt PDF with the bearer token and saves it under the invoice number', async () => {
    const invoice: InvoiceDetailDto = {
      invoiceId: 7,
      invoiceNumber: 'HD-2026-000003',
      kind: 'FEE',
      amount: 1_040_000,
      issuedAt: '2026-09-22T01:49:00Z',
      periodLabel: 'Kỳ 3/3 · Tháng 10/2026',
      slotCode: 'NVL-01',
      violationLabel: null,
      feeItemId: 3,
      penaltyId: null,
      paymentProvider: 'MOMO',
      paidAt: '2026-09-22T01:49:00Z',
    };
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
    client.apiGet.mockResolvedValue(invoice);
    client.apiGetBlob.mockResolvedValue(pdf);

    renderAt(
      '/vendor/finance/invoices/7',
      <Route path="/vendor/finance/invoices/:id" element={<InvoiceDetailScreen />} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Tải hoá đơn (PDF)' }));

    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(pdf, 'HD-2026-000003.pdf'));
    expect(client.apiGetBlob).toHaveBeenCalledWith('/vendor/finance/invoices/7/pdf');
  });
});

describe('ward collection report', () => {
  const report = (from: string, to: string) => ({
    from,
    to,
    feeCollected: 1_040_000,
    feePending: 1_040_000,
    feeOverdue: 2_080_000,
    penaltyCollected: 500_000,
    penaltyPending: 0,
    invoiceCount: 2,
    recentViolations: [],
  });
  const debtor = {
    contractId: 3,
    vendorName: 'Phạm Thị Lan',
    vendorPhone: '0905000101',
    businessName: 'Bánh mì Cô Lan',
    slotCode: 'NVL-01',
    zoneName: 'Nguyễn Văn Linh',
    overdueCount: 2,
    overdueAmount: 2_080_000,
    upcomingAmount: 1_040_000,
    oldestDueDate: '2026-08-28',
    daysOverdue: 38,
    lastRemindedAt: null,
    remindedToday: false,
  };

  // The fake server answers each report endpoint with its own shape.
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockImplementation(async (url: string) => {
      const params = new URLSearchParams(url.split('?')[1] ?? '');
      if (url.startsWith('/ward/reports/collection')) return report(params.get('from')!, params.get('to')!);
      if (url.startsWith('/ward/reports/performance')) {
        return {
          from: params.get('from'),
          to: params.get('to'),
          feeDue: 3_120_000,
          dueCount: 3,
          dueCollected: 1_040_000,
          paidOnTimeCount: 2,
          paidLateCount: 0,
          unpaidCount: 1,
          onTimeRate: 2 / 3,
          byZone: [
            { zoneId: 1, zoneName: 'Nguyễn Văn Linh', slotCount: 12, rentedSlots: 8, feeCollected: 1_040_000, outstanding: 3_120_000 },
          ],
        };
      }
      if (url.startsWith('/ward/reports/trend')) {
        return [
          { year: 2026, month: 9, feeCollected: 2_000_000, penaltyCollected: 500_000, feeDue: 3_000_000, feeDuePaidOnTime: 2_000_000 },
          { year: 2026, month: 10, feeCollected: 1_040_000, penaltyCollected: 0, feeDue: 1_040_000, feeDuePaidOnTime: 0 },
        ];
      }
      if (url === '/ward/reports/debtors') return [debtor];
      return [];
    });
  });
  afterEach(() => vi.useRealTimers());

  const collectionCalls = () =>
    client.apiGet.mock.calls.map(([path]) => String(path)).filter((path) => path.startsWith('/ward/reports/collection'));

  it('asks for the selected period in local calendar days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));

    renderAt('/ward/reports', <Route path="/ward/reports" element={<CollectionReportScreen />} />);
    await screen.findByText('Nộp phí đúng hạn');
    await userEvent.click(screen.getByRole('tab', { name: 'Tháng trước' }));
    await userEvent.click(screen.getByRole('tab', { name: '90 ngày' }));

    await waitFor(() =>
      expect(collectionCalls()).toEqual([
        '/ward/reports/collection?from=2026-10-01&to=2026-10-05',
        '/ward/reports/collection?from=2026-09-01&to=2026-09-30',
        '/ward/reports/collection?from=2026-07-08&to=2026-10-05',
      ]),
    );
  });

  it('leads with the collected total, the on-time rate, what is owed and who is overdue', async () => {
    renderAt('/ward/reports', <Route path="/ward/reports" element={<CollectionReportScreen />} />);

    expect(await screen.findByText('66,7%')).toBeInTheDocument();
    expect(screen.getByText('2/3 kỳ đến hạn trong kỳ')).toBeInTheDocument();
    expect(screen.getByText('Hộ nợ quá hạn')).toBeInTheDocument();
    expect(await screen.findByText('Bánh mì Cô Lan')).toBeInTheDocument();
    expect(screen.getByText(/quá hạn 38 ngày/i)).toBeInTheDocument();
    // The trend chart and its table view, and the zones.
    expect(await screen.findByRole('button', { name: /T10\/26: phí thuê ô/ })).toBeInTheDocument();
    expect(screen.getByText('8/12')).toBeInTheDocument();
  });

  it('a custom period asks for exactly the chosen days', async () => {
    renderAt('/ward/reports', <Route path="/ward/reports" element={<CollectionReportScreen />} />);
    await screen.findByText('Nộp phí đúng hạn');

    await userEvent.click(screen.getByRole('tab', { name: 'Tuỳ chọn' }));
    const from = screen.getByLabelText('Từ ngày');
    const to = screen.getByLabelText('Đến ngày');
    fireEvent.change(to, { target: { value: '2026-09-15' } });
    fireEvent.change(from, { target: { value: '2026-09-02' } });

    await waitFor(() =>
      expect(collectionCalls()).toContain('/ward/reports/collection?from=2026-09-02&to=2026-09-15'),
    );
  });

  it('exports the selected period as an Excel workbook', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    const workbook = new Blob(['PK']);
    client.apiGetBlob.mockResolvedValue(workbook);

    renderAt('/ward/reports', <Route path="/ward/reports" element={<CollectionReportScreen />} />);
    await screen.findByText('Nộp phí đúng hạn');
    await userEvent.click(screen.getByRole('tab', { name: 'Tháng trước' }));
    await userEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));

    await waitFor(() =>
      expect(saveFile).toHaveBeenCalledWith(workbook, 'bao-cao-thu-phi_20260901-20260930.xlsx'),
    );
    expect(client.apiGetBlob).toHaveBeenCalledWith(
      '/ward/reports/collection/export?from=2026-09-01&to=2026-09-30',
    );
  });

  it('reminds a household once and then says it was reminded today', async () => {
    client.apiPost.mockResolvedValue({ contractId: 3, remindedAt: '2026-10-02T04:00:00Z' });
    renderAt('/ward/reports/debtors', <Route path="/ward/reports/debtors" element={<WardDebtorsScreen />} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Nhắc nợ' }));

    expect(client.apiPost).toHaveBeenCalledWith('/ward/reports/debtors/3/remind');
    expect(await screen.findByRole('button', { name: 'Đã nhắc hôm nay' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Gọi/ })).toHaveAttribute('href', 'tel:0905000101');
  });
});
