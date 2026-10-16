import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { BankTransferDto, FeeItemDto, FinanceCheckoutDto } from '@/core/api';
import type { Order } from '@/features/orders/types/order.types';

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiGetBlob: vi.fn(), apiPost: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
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
vi.mock('@/features/orders/payment-redirect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/orders/payment-redirect')>()),
  redirectToPayment: redirect,
}));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enablePaymentSandbox: false } };
});

const { FeePaymentScreen } = await import('@/features/fee-schedules/screens/FeePaymentScreen');
const { OrderPaymentScreen } = await import('@/features/orders/screens/OrderPaymentScreen');
const { useBankTransferPolling } = await import('@/components/payment');

const transfer: BankTransferDto = {
  bankName: 'MBBank',
  accountNumber: '0123456789',
  accountName: 'UBND PHUONG HAI CHAU 1',
  amount: 1_040_000,
  transferContent: 'SBP9',
  qrImageUrl: 'https://qr.sepay.vn/img?acc=0123456789&bank=MBBank&amount=1040000&des=SBP9',
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

const checkout: FinanceCheckoutDto = {
  transactionId: 9,
  purpose: 'RENTAL_FEE',
  referenceId: 3,
  provider: 'SEPAY',
  amount: 1_040_000,
  paymentUrl: transfer.qrImageUrl,
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

const qrImage = () => screen.findByRole('img', { name: /Mã VietQR/ });
const checkNow = () => screen.getByRole('button', { name: 'Tôi đã chuyển khoản, kiểm tra ngay' });

describe('fee payment by SePay bank transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows the VietQR on the page instead of leaving it, and moves on once the money is in', async () => {
    let paid = false;
    client.apiGet.mockImplementation(async (url: string) => (url === '/vendor/finance/fees' ? [fee] : []));
    client.apiPost.mockImplementation(async (url: string) =>
      url.endsWith('/checkout') ? checkout : { transactionId: 9, status: paid ? 'SUCCESS' : 'PENDING' },
    );
    renderFeePayment();

    await userEvent.click(await screen.findByRole('radio', { name: /Chuyển khoản/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã chuyển khoản VietQR' }));

    expect(await qrImage()).toHaveAttribute('src', transfer.qrImageUrl);
    expect(screen.getAllByText('SBP9').length).toBeGreaterThan(0);
    expect(screen.getByText('0123456789')).toBeInTheDocument();
    expect(client.apiPost).toHaveBeenCalledWith(
      '/vendor/finance/fees/3/checkout',
      { provider: 'SEPAY' },
      expect.objectContaining({ headers: expect.anything() }),
    );
    expect(redirect).not.toHaveBeenCalled();

    // Not there yet: the QR stays.
    await userEvent.click(checkNow());
    await waitFor(() => expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/payments/9/sync'));
    expect(await qrImage()).toBeInTheDocument();

    paid = true;
    await userEvent.click(checkNow());
    expect(await screen.findByText('FINANCE HOME')).toBeInTheDocument();
  });

  it('brings the same QR back after a reload', async () => {
    sessionStorage.setItem(
      'streetbiz.financeBankTransfer',
      JSON.stringify({ transactionId: 9, path: '/vendor/finance/fees/3/payment' }),
    );
    client.apiGet.mockImplementation(async (url: string) =>
      url === '/vendor/finance/fees'
        ? [fee]
        : url === '/vendor/finance/payments/9/bank-transfer'
          ? transfer
          : [],
    );
    renderFeePayment();

    expect(await qrImage()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đang chờ chuyển khoản…' })).toBeDisabled();
  });

  it('copies the transfer content exactly as it must be sent', async () => {
    client.apiGet.mockImplementation(async (url: string) => (url === '/vendor/finance/fees' ? [fee] : []));
    client.apiPost.mockResolvedValue(checkout);
    renderFeePayment();
    await userEvent.click(await screen.findByRole('radio', { name: /Chuyển khoản/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã chuyển khoản VietQR' }));
    await qrImage();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép nội dung chuyển khoản' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('SBP9'));
  });

  it('goes back to the wallet choice with a fresh checkout when the vendor changes method', async () => {
    client.apiGet.mockImplementation(async (url: string) => (url === '/vendor/finance/fees' ? [fee] : []));
    client.apiPost.mockResolvedValue(checkout);
    renderFeePayment();
    await userEvent.click(await screen.findByRole('radio', { name: /Chuyển khoản/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã chuyển khoản VietQR' }));
    await qrImage();

    await userEvent.click(screen.getByRole('button', { name: 'Chọn phương thức khác' }));

    expect(screen.queryByRole('img', { name: /Mã VietQR/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /MoMo/ })).toBeInTheDocument();
    expect(sessionStorage.getItem('streetbiz.financeBankTransfer')).toBeNull();
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
  paymentProvider: 'SEPAY',
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

describe('order payment by SePay bank transfer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the order VietQR instead of a gateway check button', async () => {
    client.apiGet.mockResolvedValue({ mode: 'LIVE', providers: ['SEPAY'], message: '' });
    ordersApi.customerOrder.mockResolvedValue(pendingOrder);
    ordersApi.syncPayment.mockResolvedValue(pendingOrder);
    ordersApi.bankTransfer.mockResolvedValue({ ...transfer, amount: 50_000, transferContent: 'SBP55' });

    renderAt(
      ['/customer/orders/19/payment'],
      <Route path="/customer/orders/:orderId/payment" element={<OrderPaymentScreen />} />,
    );

    expect(await qrImage()).toBeInTheDocument();
    expect(ordersApi.bankTransfer).toHaveBeenCalledWith(19);
    expect(screen.getAllByText('SBP55').length).toBeGreaterThan(0);
    expect(screen.getByText(/Quét mã VietQR bên dưới/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kiểm tra lại' })).not.toBeInTheDocument();
  });

  it('a MoMo order keeps its own check button and asks for no QR', async () => {
    client.apiGet.mockResolvedValue({ mode: 'LIVE', providers: ['MOMO'], message: '' });
    const momoOrder = { ...pendingOrder, paymentProvider: 'MOMO' } as Order;
    ordersApi.customerOrder.mockResolvedValue(momoOrder);
    ordersApi.syncPayment.mockResolvedValue(momoOrder);

    renderAt(
      ['/customer/orders/19/payment'],
      <Route path="/customer/orders/:orderId/payment" element={<OrderPaymentScreen />} />,
    );

    expect(await screen.findByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument();
    expect(ordersApi.bankTransfer).not.toHaveBeenCalled();
  });
});

function Poller({ active, poll }: { active: boolean; poll: () => void }) {
  useBankTransferPolling(active, poll, 1000);
  return null;
}

describe('bank transfer polling', () => {
  afterEach(() => vi.useRealTimers());

  it('checks on every tick while waiting and stops once it is not', () => {
    vi.useFakeTimers();
    const poll = vi.fn();
    const view = render(<Poller active poll={poll} />);

    vi.advanceTimersByTime(3000);
    expect(poll).toHaveBeenCalledTimes(3);

    view.rerender(<Poller active={false} poll={poll} />);
    vi.advanceTimersByTime(3000);
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it('skips ticks while the tab is hidden', () => {
    vi.useFakeTimers();
    const poll = vi.fn();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    render(<Poller active poll={poll} />);

    vi.advanceTimersByTime(3000);

    expect(poll).not.toHaveBeenCalled();
    visibility.mockRestore();
  });
});
