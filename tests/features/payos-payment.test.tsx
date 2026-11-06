import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type {
  BankTransferDto,
  FeeItemDetailDto,
  FeeItemDto,
  FinanceCheckoutDto,
  PaymentOptionsDto,
} from '@/core/api';
import type { Order } from '@/features/orders/types/order.types';

/**
 * payOS: the money goes straight into the payee's own account (the ward for a rental fee, the
 * household for an order). The page draws the QR from the content payOS returned and settles only
 * when the backend reports the money in.
 */

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiGetBlob: vi.fn(), apiPost: vi.fn() }));
const ordersApi = vi.hoisted(() => ({
  customerOrder: vi.fn(),
  syncPayment: vi.fn(),
  bankTransfer: vi.fn(),
  cancel: vi.fn(),
  confirmSandboxPayment: vi.fn(),
  failSandboxPayment: vi.fn(),
}));

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  apiGet: client.apiGet,
  apiGetBlob: client.apiGetBlob,
  apiPost: client.apiPost,
}));
vi.mock('@/features/orders/api/orderApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/orders/api/orderApi')>()),
  orderApi: ordersApi,
}));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enablePaymentSandbox: false } };
});

const { FeePaymentScreen } = await import('@/features/fee-schedules/screens/FeePaymentScreen');
const { OrderPaymentScreen } = await import('@/features/orders/screens/OrderPaymentScreen');

const QR = '00020101021238540010A000000727012400069704220110012345678902080QRIBFTTA5303704';

const transfer: BankTransferDto = {
  bankName: 'MB Bank',
  accountNumber: '0123456789',
  accountName: 'UBND PHUONG HAI CHAU 1',
  amount: 1_040_000,
  transferContent: 'SB11',
  qrImageUrl: '',
  qrContent: QR,
  checkoutUrl: 'https://pay.payos.vn/web/abc123',
};

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

function feeDetail(paid: boolean): FeeItemDetailDto {
  return {
    contract: {
      contractId: 1,
      slotCode: 'NVL-01',
      zoneName: 'Nguyễn Văn Linh',
      wardName: 'Phường Hải Châu',
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
      nextDue: null,
    },
    item: {
      feeItemId: 3,
      ordinal: 3,
      ofCount: 3,
      periodLabel: fee.periodLabel,
      dueDate: fee.dueDate,
      amount: fee.amount,
      itemStatus: paid ? 'PAID' : 'PENDING',
      paidAt: paid ? '2026-10-18T03:00:00Z' : null,
      invoiceId: paid ? 41 : null,
      invoiceNumber: paid ? 'HD-2026-000041' : null,
      daysOverdue: null,
      daysUntilDue: paid ? null : 2,
    },
  };
}

const wardOptions: PaymentOptionsDto = {
  mode: 'LIVE',
  providers: ['PAYOS', 'MOMO'],
  message: 'Chuyển khoản ngân hàng qua VietQR, hệ thống tự xác nhận khi tiền về.',
  payee: {
    name: 'Phường Hải Châu',
    bankName: 'MB Bank',
    accountNumberMasked: '••••••6789',
    accountName: 'UBND PHUONG HAI CHAU 1',
  },
};

function feeReads(options: PaymentOptionsDto, isPaid: () => boolean = () => false) {
  return async (url: string) =>
    url === '/vendor/finance/fees'
      ? [{ ...fee, itemStatus: isPaid() ? 'PAID' : 'PENDING' }]
      : url === '/vendor/finance/fees/3'
        ? feeDetail(isPaid())
        : url === '/vendor/finance/fees/3/payment-options'
          ? options
          : url === '/vendor/finance/payments/11/bank-transfer'
            ? transfer
            : [];
}

const checkout: FinanceCheckoutDto = {
  transactionId: 11,
  purpose: 'RENTAL_FEE',
  referenceId: 3,
  provider: 'PAYOS',
  amount: 1_040_000,
  paymentUrl: transfer.checkoutUrl!,
  bankTransfer: transfer,
};

function renderAt(entries: string[], routes: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
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
    ['/vendor/finance', '/vendor/finance/fees/3/payment'],
    <Route path="/vendor/finance/fees/:id/payment" element={<FeePaymentScreen />} />,
  );

/** payOS gives the QR's content, so it is drawn as an SVG inside a named image, not an <img>. */
const qr = () => screen.findByRole('img', { name: /Mã VietQR/ });

describe('fee payment into the ward\'s own payOS account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("offers the ward's account first, names the ward, and draws the QR from payOS's content", async () => {
    let paid = false;
    client.apiGet.mockImplementation(feeReads(wardOptions, () => paid));
    client.apiPost.mockImplementation(async (url: string) =>
      url.endsWith('/checkout') ? checkout : { transactionId: 11, status: paid ? 'SUCCESS' : 'PENDING' },
    );
    renderFeePayment();

    const choice = await screen.findByRole('radio', { name: /Chuyển khoản VietQR/ });
    expect(choice).toBeChecked();
    // On the choice card, and again on the slip so the payer sees who the money goes to.
    expect(screen.getAllByText('Trả thẳng cho Phường Hải Châu')).toHaveLength(2);
    expect(client.apiGet).toHaveBeenCalledWith('/vendor/finance/fees/3/payment-options');

    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã chuyển khoản VietQR' }));

    const image = await qr();
    expect(image.tagName).not.toBe('IMG');
    expect(within(image).getByTestId('qr-code')).toBeInTheDocument();
    expect(client.apiPost).toHaveBeenCalledWith(
      '/vendor/finance/fees/3/checkout',
      { provider: 'PAYOS' },
      expect.objectContaining({ headers: expect.anything() }),
    );
    // The details to type by hand come from the ward's account, with the code to keep.
    expect(screen.getByText('MB Bank')).toBeInTheDocument();
    expect(screen.getByText('UBND PHUONG HAI CHAU 1')).toBeInTheDocument();
    expect(screen.getAllByText('SB11').length).toBeGreaterThan(0);
    const link = screen.getByRole('link', { name: /Mở trang thanh toán/ });
    expect(link).toHaveAttribute('href', 'https://pay.payos.vn/web/abc123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));

    // The money is not in yet: the QR stays. Once it is, the page turns into the receipt.
    await userEvent.click(screen.getByRole('button', { name: 'Tôi đã chuyển khoản, kiểm tra ngay' }));
    await waitFor(() => expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/payments/11/sync'));
    expect(await qr()).toBeInTheDocument();

    paid = true;
    await userEvent.click(screen.getByRole('button', { name: 'Tôi đã chuyển khoản, kiểm tra ngay' }));
    expect(await screen.findByRole('heading', { name: 'Thanh toán thành công' })).toBeInTheDocument();
    expect(screen.getByText('HD-2026-000041')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Mã VietQR/ })).not.toBeInTheDocument();
  });

  it('never opens a payment link that is not an http(s) page', async () => {
    client.apiGet.mockImplementation(feeReads(wardOptions));
    client.apiPost.mockResolvedValue({
      ...checkout,
      bankTransfer: { ...transfer, checkoutUrl: 'javascript:alert(1)' },
    });
    renderFeePayment();

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo mã chuyển khoản VietQR' }));

    await qr();
    expect(screen.queryByRole('link', { name: /Mở trang thanh toán/ })).not.toBeInTheDocument();
  });

  it('brings the same payOS QR back after a reload', async () => {
    sessionStorage.setItem(
      'streetbiz.financeBankTransfer',
      JSON.stringify({ transactionId: 11, path: '/vendor/finance/fees/3/payment' }),
    );
    client.apiGet.mockImplementation(feeReads(wardOptions));
    renderFeePayment();

    expect(await qr()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đang chờ chuyển khoản…' })).toBeDisabled();
  });

  it('lets the vendor pay by another method the server still offers', async () => {
    client.apiGet.mockImplementation(feeReads(wardOptions));
    client.apiPost.mockResolvedValue({
      ...checkout,
      provider: 'MOMO',
      bankTransfer: null,
      paymentUrl: 'https://test-payment.momo.vn/pay',
    });
    renderFeePayment();

    await userEvent.click(await screen.findByRole('radio', { name: /MoMo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Thanh toán qua MoMo / ZaloPay' }));

    await waitFor(() =>
      expect(client.apiPost).toHaveBeenCalledWith(
        '/vendor/finance/fees/3/checkout',
        { provider: 'MOMO' },
        expect.anything(),
      ),
    );
  });

  it('says nothing can be paid online when the ward has not connected an account, and offers no payment', async () => {
    client.apiGet.mockImplementation(
      feeReads({
        mode: 'UNAVAILABLE',
        providers: [],
        message: 'Thanh toán trực tuyến chưa sẵn sàng. Vui lòng thử lại sau.',
        payee: null,
      }),
    );
    renderFeePayment();

    expect(await screen.findByRole('region', { name: 'Chưa thanh toán online được' })).toBeInTheDocument();
    expect(screen.getByText(/nộp trực tiếp tại phường/)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const pay = screen.getByRole('button', { name: 'Chưa có phương thức thanh toán' });
    expect(pay).toBeDisabled();
    expect(client.apiPost).not.toHaveBeenCalled();
  });

  it('lets the vendor reload the methods when they could not be read', async () => {
    let failing = true;
    client.apiGet.mockImplementation(async (url: string) => {
      if (url === '/vendor/finance/fees/3/payment-options') {
        if (failing) throw new Error('Mất kết nối');
        return wardOptions;
      }
      return feeReads(wardOptions)(url);
    });
    renderFeePayment();

    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    expect(screen.getByRole('button', { name: 'Chưa có phương thức thanh toán' })).toBeDisabled();

    failing = false;
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại phương thức thanh toán' }));

    expect(await screen.findByRole('radio', { name: /Chuyển khoản VietQR/ })).toBeChecked();
  });
});

const pendingOrder: Order = {
  orderId: 19,
  orderCode: 'SB-000019',
  customerUserId: 7,
  customerName: 'Nguyễn Khách Hàng',
  orderStatus: 'PENDING_PAYMENT',
  storefront: { storefrontId: 2, storefrontName: 'Bếp Việt', imageUrl: null },
  subtotalAmount: 50_000,
  totalAmount: 50_000,
  paymentProvider: 'PAYOS',
  paymentStatus: 'PENDING',
  rejectionReason: null,
  refundAmount: null,
  refundReason: null,
  refundStatus: null,
  placedAt: null,
  completedAt: null,
  createdAt: '2026-09-18T00:25:00Z',
  items: [
    {
      orderItemId: 1,
      menuItemId: 11,
      itemName: 'Bánh mì',
      unitPrice: 25_000,
      quantity: 2,
      lineTotal: 50_000,
      note: null,
    },
  ],
  statusHistory: [],
} as Order;

describe('order payment into the household\'s own payOS account', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the order QR from the content payOS returned, like a SePay transfer', async () => {
    client.apiGet.mockResolvedValue({ mode: 'LIVE', providers: ['PAYOS'], message: '', payee: null });
    ordersApi.customerOrder.mockResolvedValue(pendingOrder);
    ordersApi.syncPayment.mockResolvedValue(pendingOrder);
    ordersApi.bankTransfer.mockResolvedValue({
      ...transfer,
      bankName: 'Vietcombank',
      accountNumber: '0987654321',
      accountName: 'PHAM THI LAN',
      amount: 50_000,
      transferContent: 'SB14',
    });

    renderAt(
      ['/customer/orders/19/payment'],
      <Route path="/customer/orders/:orderId/payment" element={<OrderPaymentScreen />} />,
    );

    const image = await qr();
    expect(within(image).getByTestId('qr-code')).toBeInTheDocument();
    expect(ordersApi.bankTransfer).toHaveBeenCalledWith(19);
    expect(screen.getByText('PHAM THI LAN')).toBeInTheDocument();
    expect(screen.getByText(/Quét mã VietQR bên dưới/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở trang thanh toán/ })).toBeInTheDocument();
    // A bank transfer is settled by the money arriving, not by a gateway check button.
    expect(screen.queryByRole('button', { name: 'Kiểm tra lại' })).not.toBeInTheDocument();
    expect(screen.getByText(/Đang chờ cổng thanh toán xác nhận/)).toBeInTheDocument();
  });

  it('says the transfer arrived once the backend reports the order placed', async () => {
    client.apiGet.mockResolvedValue({ mode: 'LIVE', providers: ['PAYOS'], message: '', payee: null });
    let placed = false;
    ordersApi.customerOrder.mockImplementation(async () =>
      placed ? ({ ...pendingOrder, orderStatus: 'PLACED', paymentStatus: 'SUCCESS' } as Order) : pendingOrder,
    );
    ordersApi.syncPayment.mockImplementation(async () => {
      placed = true;
      return { ...pendingOrder, orderStatus: 'PLACED', paymentStatus: 'SUCCESS' } as Order;
    });
    ordersApi.bankTransfer.mockResolvedValue({ ...transfer, amount: 50_000 });

    renderAt(
      ['/customer/orders/19/payment'],
      <Route path="/customer/orders/:orderId/payment" element={<OrderPaymentScreen />} />,
    );

    // The page asks the backend once on load; the money is in, so the order is placed.
    expect(await screen.findByText('Đặt món thành công')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Mã VietQR/ })).not.toBeInTheDocument();
    expect(ordersApi.syncPayment).toHaveBeenCalledWith(19);
  });
});
