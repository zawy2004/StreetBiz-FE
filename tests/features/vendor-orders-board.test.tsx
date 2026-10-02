import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { Order, OrderListFilters, OrderStatus } from '@/features/orders/types/order.types';

const orderApi = vi.hoisted(() => ({
  vendorOrders: vi.fn(),
  accept: vi.fn(),
  reject: vi.fn(),
  preparing: vi.fn(),
  readyForPickup: vi.fn(),
}));
vi.mock('@/features/orders/api/orderApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders/api/orderApi')>();
  return { ...actual, orderApi: { ...actual.orderApi, ...orderApi } };
});

const { OrderPipeline, VendorOrderTicket, formatWait, waitTone, ticketItemsShown } =
  await import('@/features/orders/components');
const { VendorOrdersScreen } = await import('@/features/storefronts/screens/VendorOrdersScreen');

const NOW = Date.parse('2026-10-01T07:30:00Z');

const order = (id: number, orderStatus: OrderStatus, extra: Partial<Order> = {}): Order => ({
  orderId: id,
  orderCode: `SB-${id}`,
  customerName: `Khách ${id}`,
  orderStatus,
  storefront: { storefrontId: 1, storefrontName: 'Bánh mì & Xôi Cô Lan', imageUrl: null },
  subtotalAmount: 50_000,
  totalAmount: 50_000,
  paymentProvider: 'MOMO',
  paymentStatus: 'SUCCESS',
  placedAt: '2026-10-01T07:18:00Z',
  createdAt: '2026-10-01T07:18:00Z',
  items: [
    {
      orderItemId: 1,
      menuItemId: 1,
      itemName: 'Bánh mì thịt nướng',
      unitPrice: 25_000,
      quantity: 2,
      lineTotal: 50_000,
      note: 'Ít cay',
    },
  ],
  statusHistory: [],
  ...extra,
});

describe('wait formatting', () => {
  it('reads like a person says it', () => {
    expect(formatWait(0)).toBe('vừa xong');
    expect(formatWait(12)).toBe('12 phút');
    expect(formatWait(60)).toBe('1 giờ');
    expect(formatWait(125)).toBe('2 giờ 5 phút');
    expect(formatWait(23 * 60 + 32)).toBe('23 giờ 32 phút');
    expect(formatWait(26 * 60)).toBe('1 ngày');
  });

  it('turns a new order urgent at 5 and late at 10 minutes', () => {
    expect([waitTone(4), waitTone(5), waitTone(9), waitTone(10)]).toEqual([
      'calm',
      'warn',
      'warn',
      'late',
    ]);
  });

  it('never folds away a single item', () => {
    expect(ticketItemsShown(5)).toBe(5);
    expect(ticketItemsShown(6)).toBe(4);
  });
});

describe('OrderPipeline', () => {
  const stages = [
    { value: 'A', label: 'Đơn mới', tone: 'chili' as const, count: 3 },
    { value: 'B', label: 'Đã nhận', tone: 'ink' as const, count: 0 },
    { value: 'C', label: 'Đang làm', tone: 'turmeric' as const },
  ];

  it('is a tab bar that says how many orders sit in each stage', async () => {
    const onChange = vi.fn();
    render(<OrderPipeline label="Đơn" stages={stages} value="A" onChange={onChange} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['3Đơn mới', '0Đã nhận', '–Đang làm']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(tabs[1]!);
    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('moves between stages with the arrow keys, wrapping at the ends', async () => {
    const onChange = vi.fn();
    render(<OrderPipeline label="Đơn" stages={stages} value="A" onChange={onChange} />);

    screen.getAllByRole('tab')[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('C');
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('B');
  });
});

describe('VendorOrderTicket', () => {
  it('puts what to make first, quantity before name, with the buyer’s note', () => {
    render(<VendorOrderTicket order={order(1, 'PLACED')} tone="chili" live now={NOW} />);

    const ticket = screen.getByRole('article', { name: 'Đơn SB-1' });
    expect(within(ticket).getByText('2×')).toBeInTheDocument();
    expect(within(ticket).getByText('Bánh mì thịt nướng')).toBeInTheDocument();
    expect(within(ticket).getByText('Ghi chú: Ít cay')).toBeInTheDocument();
  });

  it('flags a new order nobody has accepted for 12 minutes', () => {
    render(<VendorOrderTicket order={order(1, 'PLACED')} tone="chili" live now={NOW} />);
    expect(screen.getByText('12 phút')).toHaveClass('text-error');
  });

  it('does not flag an accepted order by its age', () => {
    render(<VendorOrderTicket order={order(1, 'ACCEPTED')} tone="ink" live now={NOW} />);
    expect(screen.getByText('12 phút')).not.toHaveClass('text-error');
  });

  it('times a stage from when the order entered it', () => {
    const cooking = order(1, 'PREPARING', {
      statusHistory: [
        {
          historyId: 1,
          fromStatus: 'ACCEPTED',
          toStatus: 'PREPARING',
          note: null,
          changedAt: '2026-10-01T07:27:00Z',
        },
      ],
    });
    render(<VendorOrderTicket order={cooking} tone="turmeric" live now={NOW} />);
    expect(screen.getByText('3 phút')).toBeInTheDocument();
  });

  it('folds a long order after four items', () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      orderItemId: index + 1,
      menuItemId: index + 1,
      itemName: `Món ${index + 1}`,
      unitPrice: 10_000,
      quantity: 1,
      lineTotal: 10_000,
    }));
    render(<VendorOrderTicket order={order(1, 'PLACED', { items })} tone="chili" live now={NOW} />);

    expect(screen.getByText('Món 4')).toBeInTheDocument();
    expect(screen.queryByText('Món 5')).not.toBeInTheDocument();
    expect(screen.getByText('+3 món nữa')).toBeInTheDocument();
  });

  it('shows status on history only where the list mixes statuses', () => {
    const { rerender } = render(
      <VendorOrderTicket order={order(1, 'REJECTED')} tone="quiet" live={false} now={NOW} />,
    );
    expect(screen.queryByText(/từ chối/i)).not.toBeInTheDocument();

    rerender(
      <VendorOrderTicket
        order={order(1, 'REJECTED')}
        tone="quiet"
        live={false}
        showStatus
        now={NOW}
      />,
    );
    expect(screen.getByText(/từ chối/i)).toBeInTheDocument();
  });
});

describe('VendorOrdersScreen', () => {
  const page = (items: Order[], totalItems = items.length) => ({
    items,
    page: 1,
    pageSize: 10,
    totalItems,
    totalPages: Math.ceil(totalItems / 10),
  });

  function renderBoard() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/vendor/orders']}>
          <Routes>
            <Route path="/vendor/orders" element={<VendorOrdersScreen />} />
            <Route path="/vendor/orders/scan" element={<div>scanner</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.resetAllMocks();
    // Counts ask for one-row pages; the list asks for ten.
    orderApi.vendorOrders.mockImplementation(async (filters: OrderListFilters) => {
      const counts: Record<string, number> = {
        PLACED: 2,
        ACCEPTED: 0,
        PREPARING: 1,
        READY_FOR_PICKUP: 4,
      };
      if (filters.pageSize === 1) return page([], counts[String(filters.status)] ?? 0);
      if (filters.status === 'PLACED') return page([order(1, 'PLACED'), order(2, 'PLACED')]);
      if (filters.status === 'READY_FOR_PICKUP') return page([order(3, 'READY_FOR_PICKUP')]);
      return page([order(4, 'REJECTED'), order(5, 'CANCELLED')]);
    });
  });

  it('counts every stage and opens on new orders', async () => {
    renderBoard();

    const stages = await screen.findByRole('tablist', { name: 'Đơn đang xử lý' });
    await waitFor(() =>
      expect(
        within(stages)
          .getAllByRole('tab')
          .map((tab) => tab.textContent),
      ).toEqual(['2Đơn mới', '0Đã nhận', '1Đang làm', '4Chờ lấy']),
    );
    expect(await screen.findAllByRole('article')).toHaveLength(2);
  });

  it('spins only the ticket being accepted', async () => {
    orderApi.accept.mockReturnValue(new Promise(() => {}));
    renderBoard();

    const [first, second] = await screen.findAllByRole('article');
    await userEvent.click(within(first!).getByRole('button', { name: 'Nhận đơn' }));

    expect(first!.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(second!.querySelector('[aria-busy="true"]')).toBeNull();
    expect(orderApi.accept).toHaveBeenCalledWith(1);
  });

  it('hands a ready order to the scanner rather than completing it', async () => {
    renderBoard();

    await userEvent.click(await screen.findByRole('tab', { name: /Chờ lấy/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Quét mã để giao' }));

    expect(await screen.findByText('scanner')).toBeInTheDocument();
  });

  it('asks the server for both closed statuses and labels each ticket', async () => {
    renderBoard();

    await userEvent.click(await screen.findByRole('tab', { name: 'Từ chối / hủy' }));

    await waitFor(() =>
      expect(orderApi.vendorOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['REJECTED', 'CANCELLED'], pageSize: 10 }),
      ),
    );
    const tickets = await screen.findAllByRole('article', { name: /SB-4|SB-5/ });
    expect(tickets).toHaveLength(2);
    expect(within(tickets[0]!).queryByRole('button', { name: 'Nhận đơn' })).not.toBeInTheDocument();
  });
});
