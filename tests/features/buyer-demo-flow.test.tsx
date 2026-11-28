import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCartStore } from '@/features/cart/cart-store';
import { CartScreen, CheckoutScreen } from '@/features/cart/screens';
import { OrderDetailScreen } from '@/features/orders/screens/OrderDetailScreen';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

/**
 * The buyer's demo path (no API: the mock database): cart, the simulated wallet payment, and the
 * order page with cancel and "đã nhận món".
 */
const BUYER = {
  id: 'USR-CUS-1',
  fullName: 'Khách',
  phone: '0905000201',
  password: '',
  role_code: 'CUSTOMER',
  account_status: 'ACTIVE',
};

function mount(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/customer/explore/cart" element={<CartScreen />} />
          <Route path="/customer/checkout" element={<CheckoutScreen />} />
          <Route path="/customer/orders/:orderId" element={<OrderDetailScreen />} />
          <Route path="/customer/orders/:orderId/review" element={<p>đánh giá</p>} />
          <Route path="/auth/sign-in" element={<p>trang đăng nhập</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const initialDb = useMockDb.getState();

beforeEach(() => {
  useMockDb.setState(initialDb, true);
  useCartStore.setState({
    items: [{ menuItemId: 'ITEM-001', storefrontId: 'STORE-001', quantity: 2 }],
  });
  useAuthStore.setState({ user: BUYER as never, sessionExpired: false });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  useCartStore.setState({ items: [] });
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('demo cart', () => {
  it('shows the dishes and the total, and changes quantities', () => {
    mount('/customer/explore/cart');

    expect(screen.getByRole('heading', { name: 'Giỏ hàng' })).toBeInTheDocument();
    expect(screen.getAllByText('Xôi gà xé').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /Thanh toán · 50\.000 đ/ }).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Tăng số lượng' })[0]!);
    expect(useCartStore.getState().items[0]!.quantity).toBe(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'Giảm số lượng' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Giảm số lượng' })[0]!);
    expect(useCartStore.getState().items[0]!.quantity).toBe(1);
  });

  it('says the cart is empty', () => {
    useCartStore.setState({ items: [] });
    mount('/customer/explore/cart');
    expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
  });

  it('goes on to checkout', () => {
    mount('/customer/explore/cart');
    fireEvent.click(screen.getAllByRole('button', { name: /Thanh toán · / })[0]!);
    expect(screen.getByRole('heading', { name: 'Thanh toán' })).toBeInTheDocument();
  });
});

describe('demo checkout', () => {
  it('pays, places the order, empties the cart and opens the order', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    mount('/customer/checkout');

    expect(screen.getAllByText('2× Xôi gà xé').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Thanh toán qua MoMo / ZaloPay' })[0]!);
    act(() => vi.runAllTimers());

    expect(useCartStore.getState().items).toHaveLength(0);
    const order = useMockDb.getState().orders.at(-1)!;
    expect(order.total).toBe(50_000);
    expect(screen.getByRole('heading', { name: `#${order.order_code}` })).toBeInTheDocument();
  });

  it('says when the simulated payment fails and lets the buyer retry', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    mount('/customer/checkout');

    fireEvent.click(screen.getAllByRole('button', { name: 'Thanh toán qua MoMo / ZaloPay' })[0]!);
    act(() => vi.runAllTimers());

    expect(screen.getByText('Thanh toán thất bại. Vui lòng thử lại.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Thử lại thanh toán' }).length).toBeGreaterThan(0);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('sends a guest to sign in, and has nothing to pay with an empty cart', () => {
    useAuthStore.setState({ user: null, sessionExpired: false });
    mount('/customer/checkout');
    fireEvent.click(screen.getAllByRole('button', { name: 'Thanh toán qua MoMo / ZaloPay' })[0]!);
    expect(screen.getByText('trang đăng nhập')).toBeInTheDocument();

    cleanup();
    useCartStore.setState({ items: [] });
    mount('/customer/checkout');
    expect(
      screen.queryByRole('button', { name: 'Thanh toán qua MoMo / ZaloPay' }),
    ).not.toBeInTheDocument();
  });
});

describe('demo order page', () => {
  function placed(status: string) {
    const order = useMockDb.getState().placeOrder({
      customerId: BUYER.id,
      storefrontId: 'STORE-001',
      items: [{ menuItemId: 'ITEM-001', name: 'Xôi gà xé', price: 25_000, quantity: 2 }],
      total: 50_000,
    });
    if (status !== 'PENDING') useMockDb.getState().updateOrderStatus(order.id, status);
    return order;
  }

  it('cancels a pending order after confirming', () => {
    const order = placed('PENDING');
    mount(`/customer/orders/${order.id}`);

    fireEvent.click(screen.getAllByRole('button', { name: 'Huỷ đơn' })[0]!);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button:last-of-type') as HTMLButtonElement);

    expect(useMockDb.getState().orders.find((o) => o.id === order.id)!.order_status).toBe(
      'CANCELLED',
    );
  });

  it('confirms pickup of a ready order, then offers a review', () => {
    const order = placed('READY_FOR_PICKUP');
    mount(`/customer/orders/${order.id}`);

    fireEvent.click(screen.getAllByRole('button', { name: 'Đã nhận món' })[0]!);
    expect(useMockDb.getState().orders.find((o) => o.id === order.id)!.order_status).toBe(
      'PICKED_UP',
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Đánh giá đơn hàng' })[0]!);
    expect(screen.getByText('đánh giá')).toBeInTheDocument();
  });

  it('says so for an order that does not exist', () => {
    mount('/customer/orders/NOPE');
    expect(screen.queryByRole('button', { name: 'Huỷ đơn' })).not.toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Không tìm thấy|không tồn tại/);
  });
});
