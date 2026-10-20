import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type {
  FeeItemDto,
  FinanceCheckoutDto,
  InvoiceDetailDto,
  PaymentTransactionDto,
  PenaltyListDto,
  VendorViolationDto,
} from '@/core/api';

// UI checks for the rebuilt vendor finance screens (V25–V31), against the live-API branch.

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  apiGet: client.apiGet,
  apiPost: client.apiPost,
}));
vi.mock('@/features/orders/payment-redirect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/orders/payment-redirect')>()),
  redirectToPayment: vi.fn(),
}));
vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));

const screens = await import('@/features/fee-schedules/screens');

const fees: FeeItemDto[] = [
  {
    feeItemId: 7,
    contractId: 1,
    slotCode: 'NVL-01',
    periodLabel: 'Kỳ 2/3 · Tháng 10/2026',
    dueDate: '2026-10-04',
    amount: 1_040_000,
    itemStatus: 'OVERDUE',
    paidAt: null,
  },
  {
    feeItemId: 6,
    contractId: 1,
    slotCode: 'NVL-01',
    periodLabel: 'Kỳ 1/3 · Tháng 09/2026',
    dueDate: '2026-09-04',
    amount: 1_040_000,
    itemStatus: 'PAID',
    paidAt: '2026-09-03T02:00:00Z',
  },
];

const penalties: PenaltyListDto[] = [
  {
    penaltyId: 4,
    violationId: 2,
    violationType: 'OBSTRUCTION',
    violationLabel: 'Cản trở lối đi bộ',
    slotCode: 'NVL-08',
    amount: 1_000_000,
    penaltyStatus: 'UNPAID',
    issuedAt: '2026-10-01T13:00:00Z',
    paidAt: null,
  },
  {
    penaltyId: 3,
    violationId: 1,
    violationType: 'OVER_BOUNDARY',
    violationLabel: 'Lấn ranh giới ô',
    slotCode: 'NVL-01',
    amount: 500_000,
    penaltyStatus: 'PAID',
    issuedAt: '2026-08-20T03:00:00Z',
    paidAt: '2026-08-21T03:00:00Z',
  },
];

function Where() {
  return <p>AT {useLocation().pathname}</p>;
}

function renderAt(path: string, routes: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/finance', path]} initialIndex={1}>
        <Routes>
          <Route path="/vendor/finance" element={<p>FINANCE HOME</p>} />
          {routes}
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function answer(map: Record<string, unknown>) {
  client.apiGet.mockImplementation(async (path: string) => {
    if (!(path in map)) throw new Error(`unexpected GET ${path}`);
    return map[path];
  });
}

beforeEach(() => vi.clearAllMocks());

describe('V25 Tài chính', () => {
  const renderHome = () =>
    renderAt(
      '/vendor/finance/home',
      <Route path="/vendor/finance/home" element={<screens.FinanceHomeScreen />} />,
    );

  it('never shows "0 đ" while the total is loading', async () => {
    answer({
      '/vendor/finance/summary': new Promise(() => {}),
      '/vendor/finance/fees': fees,
      '/vendor/finance/penalties': penalties,
      '/vendor/finance/invoices': [],
    });
    renderHome();
    await screen.findByText('Kỳ 2/3 · Tháng 10/2026');
    expect(screen.queryByText('0 đ')).not.toBeInTheDocument();
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('keeps each tab named by its label alone, with the count beside it', async () => {
    answer({
      '/vendor/finance/summary': {
        feeDue: 1_040_000,
        penaltyDue: 1_000_000,
        totalDue: 2_040_000,
        overdueCount: 1,
        nextDueDate: null,
      },
      '/vendor/finance/fees': fees,
      '/vendor/finance/penalties': penalties,
      '/vendor/finance/invoices': [],
    });
    renderHome();
    expect(await screen.findByText('2.040.000 đ')).toBeInTheDocument();
    expect(screen.getByText('1 khoản quá hạn')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Phí thuê ô' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Biên bản phạt' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hoá đơn' })).toBeInTheDocument();
  });

  it('only lets payable fees open the payment page', async () => {
    answer({
      '/vendor/finance/summary': new Promise(() => {}),
      '/vendor/finance/fees': fees,
      '/vendor/finance/penalties': penalties,
      '/vendor/finance/invoices': [],
    });
    renderHome();
    const paid = await screen.findByText('Kỳ 1/3 · Tháng 09/2026');
    expect(paid.closest('button')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Kỳ 2\/3 · Tháng 10\/2026/ }));
    expect(await screen.findByText('AT /vendor/finance/fees/7/payment')).toBeInTheDocument();
  });

  it('only lets unpaid penalty notices open the payment page', async () => {
    answer({
      '/vendor/finance/summary': new Promise(() => {}),
      '/vendor/finance/fees': [],
      '/vendor/finance/penalties': penalties,
      '/vendor/finance/invoices': [],
    });
    renderHome();
    await userEvent.click(await screen.findByRole('tab', { name: 'Biên bản phạt' }));
    expect(screen.getByText('Lấn ranh giới ô').closest('button')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Cản trở lối đi bộ/ }));
    expect(await screen.findByText('AT /vendor/finance/penalties/4/payment')).toBeInTheDocument();
  });
});

describe('V26 Thanh toán phí thuê ô', () => {
  it('shows the slot plate on the slip and never says the fee is paid before it is', async () => {
    answer({ '/vendor/finance/fees': [fees[0]] });
    renderAt(
      '/vendor/finance/fees/7/payment',
      <Route path="/vendor/finance/fees/:id/payment" element={<screens.FeePaymentScreen />} />,
    );
    const slip = await screen.findByRole('region', { name: 'Khoản phí cần thanh toán' });
    expect(within(slip).getByText('Ô NVL-01')).toBeInTheDocument();
    expect(screen.queryByText(/đã thanh toán/i)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /MoMo/ })).toBeChecked();
  });

  it('never lights the "recorded" stop while waiting for the wallet', async () => {
    answer({ '/vendor/finance/fees': [fees[0]] });
    client.apiPost.mockResolvedValue({ transactionId: 9, status: 'PENDING' });
    renderAt(
      '/vendor/finance/fees/7/payment?orderId=SB-T9',
      <Route path="/vendor/finance/fees/:id/payment" element={<screens.FeePaymentScreen />} />,
    );
    expect(await screen.findByText('MoMo chưa xác nhận thanh toán')).toBeInTheDocument();
    expect(screen.getByText('SB-T9')).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent('StreetBiz ghi nhận');
  });
});

describe('V27 Thanh toán biên bản phạt', () => {
  const checkout: FinanceCheckoutDto = {
    transactionId: 11,
    purpose: 'PENALTY',
    referenceId: 4,
    provider: 'MOMO',
    amount: 1_000_000,
    paymentUrl: 'streetbiz://payment/sandbox/momo?referenceId=4&transactionId=11',
  };
  const renderPenalty = () =>
    renderAt(
      '/vendor/finance/penalties/4/payment',
      <Route
        path="/vendor/finance/penalties/:id/payment"
        element={<screens.PenaltyPaymentScreen />}
      />,
    );

  it('shows the notice with its slot and date', async () => {
    answer({ '/vendor/finance/penalties': penalties });
    renderPenalty();
    const notice = await screen.findByRole('article', { name: 'Biên bản phạt' });
    expect(within(notice).getByText('Ô NVL-08')).toBeInTheDocument();
    expect(within(notice).getByText(/^Lập ngày /)).toBeInTheDocument();
    expect(within(notice).getByText('Cản trở lối đi bộ')).toBeInTheDocument();
  });

  it('checks out the penalty, retrying with the same Idempotency-Key, then goes back', async () => {
    answer({ '/vendor/finance/penalties': penalties });
    client.apiPost
      .mockRejectedValueOnce(new ApiError('network_error', 0, 'Mất kết nối'))
      .mockImplementation(async (url: string) =>
        url.endsWith('/checkout') ? checkout : { outcome: 'APPLIED', callbackEventId: 1 },
      );
    renderPenalty();

    const pay = () => screen.findByRole('button', { name: /Thanh toán qua MoMo/ });
    await userEvent.click(await pay());
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    await userEvent.click(await pay());
    expect(await screen.findByText('FINANCE HOME')).toBeInTheDocument();

    const calls = client.apiPost.mock.calls.filter(([url]) => String(url).endsWith('/checkout'));
    expect(calls.map(([url]) => url)).toEqual([
      '/vendor/finance/penalties/4/checkout',
      '/vendor/finance/penalties/4/checkout',
    ]);
    expect(calls[0]?.[2].headers['Idempotency-Key']).toBe(calls[1]?.[2].headers['Idempotency-Key']);
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/payments/11/sandbox-confirm');
  });
});

describe('V29 Chi tiết hoá đơn', () => {
  const detail: InvoiceDetailDto = {
    invoiceId: 2,
    invoiceNumber: 'HD-2026-000002',
    kind: 'RENTAL_FEE',
    amount: 2_630_000,
    issuedAt: '2026-09-27T01:48:00Z',
    periodLabel: 'Kỳ 1/3 · Tháng 09/2026',
    slotCode: 'NVL-01',
    violationLabel: null,
    feeItemId: 6,
    penaltyId: null,
    paymentProvider: 'MOMO',
    paidAt: '2026-09-27T01:48:00Z',
  };
  const renderDetail = () =>
    renderAt(
      '/vendor/finance/invoices/2',
      <Route path="/vendor/finance/invoices/:id" element={<screens.InvoiceDetailScreen />} />,
    );

  it('stamps the receipt only when the server says when it was paid', async () => {
    answer({ '/vendor/finance/invoices/2': detail });
    renderDetail();
    expect(await screen.findByText('ĐÃ THANH TOÁN')).toBeInTheDocument();
    expect(screen.getByText('MoMo')).toBeInTheDocument();
    expect(screen.getByText('Ô NVL-01')).toBeInTheDocument();
    expect(await screen.findByText('STREETBIZ ★ ĐÃ THANH TOÁN ★')).toBeInTheDocument();
  });

  it('draws no stamp and says "Chờ duyệt" without paidAt', async () => {
    answer({ '/vendor/finance/invoices/2': { ...detail, paidAt: null } });
    renderDetail();
    expect(await screen.findByText('CHỜ DUYỆT')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByText('STREETBIZ ★ ĐÃ THANH TOÁN ★')).not.toBeInTheDocument();
    expect(screen.queryByText('Thanh toán lúc')).not.toBeInTheDocument();
  });

  it('names the penalty for a penalty invoice', async () => {
    answer({
      '/vendor/finance/invoices/2': {
        ...detail,
        kind: 'PENALTY',
        violationLabel: 'Cản trở lối đi bộ',
      },
    });
    renderDetail();
    expect(await screen.findByText('Biên bản phạt')).toBeInTheDocument();
    expect(screen.getByText('Cản trở lối đi bộ')).toBeInTheDocument();
  });

  it('says it cannot find an invoice whose id is not a number', async () => {
    renderAt(
      '/vendor/finance/invoices/abc',
      <Route path="/vendor/finance/invoices/:id" element={<screens.InvoiceDetailScreen />} />,
    );
    expect(await screen.findByText('Không tìm thấy hoá đơn.')).toBeInTheDocument();
    expect(client.apiGet).not.toHaveBeenCalled();
  });
});

describe('V30 Lịch sử thanh toán', () => {
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
  const renderHistory = () =>
    renderAt(
      '/vendor/finance/payments',
      <Route path="/vendor/finance/payments" element={<screens.PaymentHistoryScreen />} />,
    );

  it('shows when the wallet confirmed, and no filter when everything went through', async () => {
    answer({
      '/vendor/finance/payments': [row, { ...row, transactionId: 6, callbackReceivedAt: null }],
    });
    renderHistory();
    expect(await screen.findAllByText(/^Ví xác nhận lúc /)).toHaveLength(1);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('offers a filter once an attempt failed or is still pending', async () => {
    answer({
      '/vendor/finance/payments': [
        row,
        { ...row, transactionId: 7, transactionStatus: 'FAILED', callbackReceivedAt: null },
      ],
    });
    renderHistory();
    await userEvent.click(await screen.findByRole('tab', { name: 'Chưa thành công' }));
    expect(screen.getAllByText('Kỳ 3/3 · Tháng 10/2026')).toHaveLength(1);
    expect(screen.getByText('THẤT BẠI')).toBeInTheDocument();
  });
});

describe('V31 Lịch sử vi phạm', () => {
  const violation: VendorViolationDto = {
    violationId: 1,
    violationType: 'OBSTRUCTION',
    violationLabel: 'Cản trở lối đi bộ',
    description: 'Kê bàn ghế chiếm hết lối đi bộ.',
    evidenceUrl: null,
    source: 'ON_SITE',
    recordedAt: '2026-10-01T13:04:48Z',
    slotCode: 'NVL-08',
    penaltyAmount: 1_000_000,
    penaltyStatus: 'UNPAID',
  };

  it('adds up what is still unpaid, says where each notice came from, and shows no money without a fine', async () => {
    answer({
      '/vendor/finance/violations': [
        violation,
        {
          ...violation,
          violationId: 2,
          violationLabel: 'Để rác trên vỉa hè',
          source: 'CUSTOMER_REPORT',
          penaltyAmount: null,
          penaltyStatus: null,
        },
      ],
    });
    renderAt(
      '/vendor/finance/violations',
      <Route path="/vendor/finance/violations" element={<screens.VendorViolationsScreen />} />,
    );
    const sheet = await screen.findByRole('article', { name: 'Cản trở lối đi bộ' });
    expect(within(sheet).getByText('Lập tại chỗ')).toBeInTheDocument();
    expect(within(sheet).getByText('CHƯA THANH TOÁN')).toBeInTheDocument();
    const other = screen.getByRole('article', { name: 'Để rác trên vỉa hè' });
    expect(within(other).getByText('Từ phản ánh của người dân')).toBeInTheDocument();
    expect(within(other).queryByText(/đ$/)).not.toBeInTheDocument();
    expect(screen.getByText('Chưa nộp').parentElement).toHaveTextContent('1.000.000 đ');
  });

  it('keeps the empty state', async () => {
    answer({ '/vendor/finance/violations': [] });
    renderAt(
      '/vendor/finance/violations',
      <Route path="/vendor/finance/violations" element={<screens.VendorViolationsScreen />} />,
    );
    expect(await screen.findByText('Không có vi phạm nào')).toBeInTheDocument();
  });
});

describe('V28 Sổ hoá đơn', () => {
  it('groups invoices by month and opens the detail', async () => {
    answer({
      '/vendor/finance/invoices': [
        {
          invoiceId: 2,
          invoiceNumber: 'HD-2026-000002',
          kind: 'RENTAL_FEE',
          amount: 2_630_000,
          issuedAt: '2026-09-27T01:00:00Z',
          periodLabel: 'Kỳ 1/3 · Tháng 09/2026',
        },
        {
          invoiceId: 1,
          invoiceNumber: 'HD-2026-000001',
          kind: 'PENALTY',
          amount: 500_000,
          issuedAt: '2026-08-20T01:00:00Z',
          periodLabel: null,
        },
      ],
    });
    renderAt(
      '/vendor/finance/invoices',
      <Route path="/vendor/finance/invoices" element={<screens.InvoicesListScreen />} />,
    );
    expect(await screen.findByRole('heading', { name: 'Tháng 9/2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tháng 8/2026' })).toBeInTheDocument();
    // Both kinds are present, so the kind filter shows.
    expect(screen.getByRole('tab', { name: 'Tiền phạt' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /HD-2026-000002/ }));
    await waitFor(() =>
      expect(screen.getByText('AT /vendor/finance/invoices/2')).toBeInTheDocument(),
    );
  });

  it('keeps the empty state', async () => {
    answer({ '/vendor/finance/invoices': [] });
    renderAt(
      '/vendor/finance/invoices',
      <Route path="/vendor/finance/invoices" element={<screens.InvoicesListScreen />} />,
    );
    expect(await screen.findByText('Chưa có hoá đơn nào')).toBeInTheDocument();
  });
});
