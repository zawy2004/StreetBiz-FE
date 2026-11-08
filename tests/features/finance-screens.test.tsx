import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type {
  FeeItemDetailDto,
  FeeItemDto,
  InvoiceDetailDto,
  PaymentOptionsDto,
  PaymentTransactionDto,
  PenaltyListDto,
  PenaltyReceiptDto,
  PenaltyTreasuryDto,
  VendorViolationDto,
} from '@/core/api';

// UI checks for the rebuilt vendor finance screens (V25–V31), against the live-API branch.

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiUpload: vi.fn() }));

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  apiGet: client.apiGet,
  apiPost: client.apiPost,
  apiUpload: client.apiUpload,
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

const platformOptions: PaymentOptionsDto = {
  mode: 'SANDBOX',
  providers: ['MOMO', 'ZALOPAY'],
  message: '',
  payee: null,
};

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
  // The payment page pays from the fee list; the instalment with its contract
  // (GET /vendor/finance/fees/{id}) adds the contract's progress and, once paid, the receipt.
  const overdue: FeeItemDetailDto = {
    contract: {
      contractId: 1,
      slotCode: 'NVL-01',
      zoneName: 'Nguyễn Văn Linh',
      wardName: 'Phường Hải Châu',
      address: null,
      startDate: '2026-09-01',
      endDate: '2026-11-30',
      contractStatus: 'ACTIVE',
      totalAmount: 3_120_000,
      paidAmount: 1_040_000,
      outstandingAmount: 2_080_000,
      instalmentCount: 3,
      paidCount: 1,
      overdueCount: 1,
      nextDue: null,
    },
    item: {
      feeItemId: 7,
      ordinal: 2,
      ofCount: 3,
      periodLabel: 'Kỳ 2/3 · Tháng 10/2026',
      dueDate: '2026-10-04',
      amount: 1_040_000,
      itemStatus: 'OVERDUE',
      paidAt: null,
      invoiceId: null,
      invoiceNumber: null,
      daysOverdue: 12,
      daysUntilDue: null,
    },
  };

  it('shows the slot plate on the slip and never says the fee is paid before it is', async () => {
    answer({
      '/vendor/finance/fees': [fees[0]],
      '/vendor/finance/fees/7': overdue,
      '/vendor/finance/fees/7/payment-options': platformOptions,
    });
    renderAt(
      '/vendor/finance/fees/7/payment',
      <Route path="/vendor/finance/fees/:id/payment" element={<screens.FeePaymentScreen />} />,
    );
    const slip = await screen.findByRole('region', { name: 'Khoản phí cần thanh toán' });
    expect(within(slip).getByText('Ô NVL-01')).toBeInTheDocument();
    expect(screen.getByText('Hợp đồng đã nộp 1/3 kỳ')).toBeInTheDocument();
    expect(screen.queryByText(/đã thanh toán/i)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /MoMo/ })).toBeChecked();
  });

  it('never lights the "recorded" stop while waiting for the wallet', async () => {
    // Only the fee list answers: the page still works without the instalment's detail.
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

  it('opens a paid instalment on its receipt, never on the pay button', async () => {
    const paidDetail: FeeItemDetailDto = {
      ...overdue,
      item: {
        ...overdue.item,
        feeItemId: 6,
        ordinal: 1,
        periodLabel: 'Kỳ 1/3 · Tháng 09/2026',
        dueDate: '2026-09-04',
        itemStatus: 'PAID',
        paidAt: '2026-09-03T02:00:00Z',
        invoiceId: 31,
        invoiceNumber: 'HD-2026-000001',
        daysOverdue: null,
      },
    };
    answer({ '/vendor/finance/fees': [fees[1]], '/vendor/finance/fees/6': paidDetail });
    renderAt(
      '/vendor/finance/fees/6/payment',
      <Route path="/vendor/finance/fees/:id/payment" element={<screens.FeePaymentScreen />} />,
    );
    expect(await screen.findByText('HD-2026-000001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem hoá đơn' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh toán qua MoMo/ })).not.toBeInTheDocument();
  });

  it('says a paid instalment is paid when its receipt cannot be read, instead of offering to pay', async () => {
    // The list is the only read that answers: the detail (receipt) read fails.
    answer({ '/vendor/finance/fees': [fees[1]] });
    renderAt(
      '/vendor/finance/fees/6/payment',
      <Route path="/vendor/finance/fees/:id/payment" element={<screens.FeePaymentScreen />} />,
    );
    expect(
      await screen.findByText('Kỳ phí này đã được thanh toán. Hoá đơn nằm trong mục Hoá đơn.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh toán qua MoMo/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem hoá đơn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại biên nhận' })).toBeInTheDocument();
  });

  it('refuses a cancelled instalment', async () => {
    answer({
      '/vendor/finance/fees': [{ ...fees[0], itemStatus: 'CANCELLED' }],
      '/vendor/finance/fees/7': { ...overdue, item: { ...overdue.item, itemStatus: 'CANCELLED' } },
    });
    renderAt(
      '/vendor/finance/fees/7/payment',
      <Route path="/vendor/finance/fees/:id/payment" element={<screens.FeePaymentScreen />} />,
    );
    expect(
      await screen.findByText('Kỳ phí này đã bị huỷ nên không cần thanh toán.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh toán qua MoMo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem hoá đơn' })).not.toBeInTheDocument();
  });
});

describe('V27 Nộp phạt vào Kho bạc', () => {
  // A fine is paid to the State Treasury, not through StreetBiz: the page tells how, takes the
  // receipt and shows where the ward's check of it stands. There is no payment button.
  const treasury: PenaltyTreasuryDto = {
    penaltyId: 4,
    amount: 1_000_000,
    decisionNumber: 'QĐXP-2026/0004',
    violationLabel: 'Cản trở lối đi bộ',
    slotCode: 'NVL-08',
    wardName: 'Phường Hải Châu',
    penaltyStatus: 'UNPAID',
    issuedAt: '2026-10-01T13:00:00Z',
    canSubmit: true,
    instructions: [
      'Nộp tiền phạt vào tài khoản Kho bạc Nhà nước ghi trong quyết định xử phạt số QĐXP-2026/0004.',
      'Nộp xong, chụp hoặc tải biên lai lên đây. StreetBiz không thu hộ và không chuyển tiền phạt.',
    ],
    latestReceipt: null,
  };
  const receipt: PenaltyReceiptDto = {
    receiptId: 5,
    penaltyId: 4,
    status: 'SUBMITTED',
    receiptUrl: '/api/uploads/evidence/7/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
    reference: 'KB-2026-1',
    paidOn: '2026-10-20',
    note: null,
    submittedAt: '2026-10-20T03:00:00Z',
    reviewedAt: null,
    reviewNote: null,
  };
  const renderPenalty = () =>
    renderAt(
      '/vendor/finance/penalties/4/payment',
      <Route
        path="/vendor/finance/penalties/:id/payment"
        element={<screens.PenaltyPaymentScreen />}
      />,
    );

  it('shows the notice with its slot and date, and how to pay the Treasury', async () => {
    answer({ '/vendor/finance/penalties/4/treasury': treasury });
    renderPenalty();
    const notice = await screen.findByRole('article', { name: 'Biên bản phạt' });
    expect(within(notice).getByText('Ô NVL-08')).toBeInTheDocument();
    expect(within(notice).getByText(/^Lập ngày /)).toBeInTheDocument();
    expect(within(notice).getByText('Cản trở lối đi bộ')).toBeInTheDocument();
    expect(within(notice).getByText('Nộp vào Kho bạc Nhà nước')).toBeInTheDocument();
    expect(
      await screen.findByText(/tài khoản Kho bạc Nhà nước ghi trong quyết định/),
    ).toBeInTheDocument();
    expect(screen.getByText(/StreetBiz không thu hộ và không chuyển tiền phạt/)).toBeInTheDocument();
    // Fines are not paid through a wallet any more.
    expect(screen.queryByRole('button', { name: /Thanh toán qua MoMo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Gửi biên lai nộp phạt' })).toBeInTheDocument();
  });

  it('asks for the receipt file before anything is sent', async () => {
    answer({ '/vendor/finance/penalties/4/treasury': treasury });
    renderPenalty();

    await userEvent.click(await screen.findByRole('button', { name: 'Gửi biên lai cho phường' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn ảnh hoặc PDF biên lai');
    expect(client.apiUpload).not.toHaveBeenCalled();
    expect(client.apiPost).not.toHaveBeenCalled();
  });

  it('uploads the receipt once and sends it, even when the first send fails', async () => {
    answer({ '/vendor/finance/penalties/4/treasury': treasury });
    client.apiUpload.mockResolvedValue({
      fileUrl: receipt.receiptUrl,
      contentType: 'image/jpeg',
      sizeBytes: 12,
    });
    client.apiPost
      .mockRejectedValueOnce(new ApiError('network_error', 0, 'Mất kết nối'))
      .mockResolvedValueOnce(receipt);
    renderPenalty();

    const picker = await screen.findByLabelText('Tải ảnh hoặc PDF biên lai');
    await userEvent.upload(picker, new File(['x'], 'bien-lai.jpg', { type: 'image/jpeg' }));
    await userEvent.type(screen.getByLabelText('Số chứng từ (nếu có)'), 'KB-2026-1');
    const send = () => screen.findByRole('button', { name: 'Gửi biên lai cho phường' });

    await userEvent.click(await send());
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    await userEvent.click(await send());

    await waitFor(() => expect(client.apiPost).toHaveBeenCalledTimes(2));
    // The file is stored once; the retry only repeats the send.
    expect(client.apiUpload).toHaveBeenCalledTimes(1);
    const [url, body] = client.apiPost.mock.calls[1] as [string, Record<string, unknown>];
    expect(url).toBe('/vendor/finance/penalties/4/receipts');
    expect(body).toMatchObject({
      receiptUrl: receipt.receiptUrl,
      reference: 'KB-2026-1',
      note: null,
    });
    expect(body.paidOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('while a receipt waits shows where it stands and offers no second one', async () => {
    answer({
      '/vendor/finance/penalties/4/treasury': { ...treasury, canSubmit: false, latestReceipt: receipt },
    });
    renderPenalty();

    const status = await screen.findByRole('region', { name: 'Biên lai đã gửi' });
    expect(within(status).getByText('CHỜ PHƯỜNG KIỂM TRA')).toBeInTheDocument();
    expect(within(status).getByText('KB-2026-1')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Gửi biên lai nộp phạt' })).not.toBeInTheDocument();
  });

  it("shows the ward's reason when the receipt was turned down and lets the household send another", async () => {
    answer({
      '/vendor/finance/penalties/4/treasury': {
        ...treasury,
        latestReceipt: {
          ...receipt,
          status: 'REJECTED',
          reviewNote: 'Ảnh bị mờ, không đọc được số tiền.',
        },
      },
    });
    renderPenalty();

    expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh bị mờ, không đọc được số tiền.');
    expect(screen.getByRole('form', { name: 'Gửi biên lai nộp phạt' })).toBeInTheDocument();
  });

  it('says the fine is recorded once the ward has accepted the receipt', async () => {
    answer({
      '/vendor/finance/penalties/4/treasury': {
        ...treasury,
        penaltyStatus: 'PAID',
        canSubmit: false,
        latestReceipt: { ...receipt, status: 'ACCEPTED' },
      },
    });
    renderPenalty();

    expect(
      await screen.findByText(/Phường đã ghi nhận khoản phạt này là đã nộp/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Gửi biên lai nộp phạt' })).not.toBeInTheDocument();
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
