import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_BOTTOM_TABS, RoleTabBar } from '@/components/layout/RoleTabBar';
import { CUSTOMER_TABS, VENDOR_TABS, WARD_TABS } from '@/layouts/role-tabs';
import { useScrollAway } from '@/features/assistant/useScrollAway';
import { OrderCard } from '@/features/orders/components/OrderCard';
import type { Order } from '@/features/orders/types/order.types';

function phoneViewport() {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function mountBar(items: typeof WARD_TABS, path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <RoleTabBar roleLabel="Vai trò" items={items} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
}

afterEach(cleanup);

describe('phone tab bar', () => {
  beforeEach(phoneViewport);

  it('keeps five tabs when the role has five, with no "Thêm"', () => {
    const bar = mountBar(CUSTOMER_TABS, '/customer/explore');

    expect(bar.getAllByRole('link')).toHaveLength(CUSTOMER_TABS.length);
    expect(bar.queryByRole('button', { name: /Thêm/ })).not.toBeInTheDocument();
  });

  it('shows four ward tabs and moves the other three behind "Thêm"', () => {
    const bar = mountBar(WARD_TABS, '/ward/dashboard');

    expect(bar.getAllByRole('link').map((l) => l.textContent)).toEqual(
      WARD_TABS.slice(0, MAX_BOTTOM_TABS - 1).map((t) => t.label),
    );
    fireEvent.click(bar.getByRole('button', { name: /Thêm/ }));

    const sheet = screen.getByRole('heading', { name: 'Mục khác' }).parentElement!;
    expect(
      within(sheet)
        .getAllByRole('link')
        .map((l) => l.getAttribute('href')),
    ).toEqual(WARD_TABS.slice(MAX_BOTTOM_TABS - 1).map((t) => t.to));
  });

  it('lights "Thêm" when the officer is on a page that lives behind it', () => {
    const bar = mountBar(WARD_TABS, '/ward/reports/debtors');

    expect(bar.getByRole('button', { name: /Thêm/ }).querySelector('.bg-primary')).not.toBeNull();
  });

  it('carries the unread count of a hidden tab onto "Thêm"', () => {
    const items = VENDOR_TABS.map((t) => (t.to === '/vendor/chat' ? { ...t, badge: 3 } : t));
    const bar = mountBar(items, '/vendor/home');

    expect(bar.getByRole('button', { name: /Thêm/ })).toHaveTextContent('3');
  });
});

describe('order card', () => {
  const order = {
    orderId: 7,
    orderCode: 'DH-2026-0007',
    orderStatus: 'COMPLETED',
    totalAmount: 50_000,
    createdAt: '2026-11-01T07:00:00Z',
    placedAt: '2026-11-01T07:00:00Z',
    items: [{ menuItemId: 1, name: 'Bánh mì', quantity: 2, unitPrice: 25_000 }],
    statusHistory: [],
    storefront: { storefrontId: 1, storefrontName: 'Bánh mì & Xôi Cô Lan' },
  } as unknown as Order;

  it('is one button: "Xem chi tiết" is not a second button inside it', () => {
    const open = vi.fn();
    render(
      <MemoryRouter>
        <OrderCard order={order} onPress={open} />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.querySelector('button')).toBeNull();
    fireEvent.click(screen.getByText('Xem chi tiết'));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('keeps a real "Xem chi tiết" button when the card carries its own actions', () => {
    const open = vi.fn();
    render(
      <MemoryRouter>
        <OrderCard order={order} onPress={open} actions={<span>Hành động</span>} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' }));
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('assistant launcher steps aside while content scrolls down', () => {
  function scroller() {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollHeight', { value: 3000, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 800, configurable: true });
    document.body.appendChild(el);
    const scrollTo = (top: number) => {
      el.scrollTop = top;
      el.dispatchEvent(new Event('scroll'));
    };
    return { el, scrollTo };
  }

  it('hides on a scroll down, returns on a scroll up, at the top and at the end', () => {
    const { result } = renderHook(() => useScrollAway('/vendor/home'));
    const { el, scrollTo } = scroller();

    act(() => scrollTo(100));
    act(() => scrollTo(400));
    expect(result.current).toBe(true);

    act(() => scrollTo(300));
    expect(result.current).toBe(false);

    act(() => scrollTo(900));
    expect(result.current).toBe(true);
    act(() => scrollTo(2190)); // within 80px of the end
    expect(result.current).toBe(false);

    act(() => scrollTo(1500));
    act(() => scrollTo(20)); // back near the top
    expect(result.current).toBe(false);
    el.remove();
  });

  it('ignores a small jitter and comes back on navigation', () => {
    const { result, rerender } = renderHook(({ path }) => useScrollAway(path), {
      initialProps: { path: '/vendor/home' },
    });
    const { el, scrollTo } = scroller();

    act(() => scrollTo(500));
    act(() => scrollTo(505));
    expect(result.current).toBe(false);
    act(() => scrollTo(700));
    expect(result.current).toBe(true);

    rerender({ path: '/vendor/finance' });
    expect(result.current).toBe(false);
    el.remove();
  });
});
