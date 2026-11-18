import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { SellerMenuItem } from '@/core/api/seller-store-api';
import {
  MAX_PER_DISH,
  NOTE_MAX,
  add,
  clearDish,
  countOf,
  isSellable,
  remove,
  saleNote,
  toLines,
  totalOf,
} from '@/features/storefronts/counter-sale';

const api = vi.hoisted(() => ({
  stores: vi.fn(),
  menu: vi.fn(),
  ledger: vi.fn(),
  addEntry: vi.fn(),
  voidEntry: vi.fn(),
}));

vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));
vi.mock('@/core/api/seller-store-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/seller-store-api')>();
  return {
    ...actual,
    sellerStoreApi: { ...actual.sellerStoreApi, stores: api.stores, menu: api.menu },
  };
});
vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return {
    ...actual,
    taxApi: {
      ...actual.taxApi,
      ledger: api.ledger,
      addEntry: api.addEntry,
      voidEntry: api.voidEntry,
    },
  };
});

const { CounterSaleScreen } = await import('@/features/storefronts/screens/CounterSaleScreen');

const dish = (
  id: number,
  name: string,
  unitPrice: number,
  over: Partial<SellerMenuItem> = {},
): SellerMenuItem =>
  ({
    menuItemId: id,
    storefrontId: 1,
    categoryId: 2,
    name,
    description: null,
    unitPrice,
    availabilityStatus: 'AVAILABLE',
    imageUrl: null,
    categoryName: 'Ăn sáng',
    requiresFoodSafety: false,
    foodSafetyStatus: 'NOT_REQUIRED',
    foodSafetyExpiresOn: null,
    nameEn: null,
    priceUnit: 'phần',
    ...over,
  }) as SellerMenuItem;

const BANH_MI = dish(1, 'Bánh mì', 20_000);
const TRA_DA = dish(2, 'Trà đá', 5_000);
const HET = dish(3, 'Xôi', 15_000, { availabilityStatus: 'SOLD_OUT' });
const MENU = [BANH_MI, TRA_DA, HET];

describe('counter sale basket', () => {
  it('adds one per tap, up to a cap, and takes one away or the whole dish', () => {
    let basket = add({}, 1);
    basket = add(add(basket, 1), 2);
    expect(basket).toEqual({ 1: 2, 2: 1 });

    expect(remove(basket, 1)).toEqual({ 1: 1, 2: 1 });
    expect(remove({ 1: 1 }, 1)).toEqual({});
    expect(remove({}, 1)).toEqual({});
    expect(clearDish(basket, 1)).toEqual({ 2: 1 });

    let capped = {};
    for (let i = 0; i < MAX_PER_DISH + 5; i += 1) capped = add(capped, 1);
    expect(capped).toEqual({ 1: MAX_PER_DISH });
  });

  it('prices lines in menu order and leaves out a dish that can no longer be sold', () => {
    const lines = toLines({ 2: 1, 1: 2, 3: 4, 99: 1 }, MENU);

    expect(lines.map((l) => [l.item.name, l.quantity, l.amount])).toEqual([
      ['Bánh mì', 2, 40_000],
      ['Trà đá', 1, 5_000],
    ]);
    expect(totalOf(lines)).toBe(45_000);
    expect(countOf(lines)).toBe(3);
    expect(isSellable(HET)).toBe(false);
  });

  it('writes the note the revenue book keeps, and a count when it would not fit', () => {
    expect(saleNote(toLines({ 1: 2, 2: 1 }, MENU))).toBe('Bán tại quầy: Bánh mì ×2, Trà đá ×1');

    const many = Array.from({ length: 40 }, (_, i) =>
      dish(100 + i, `Món có tên khá dài số ${i}`, 1000),
    );
    const basket = Object.fromEntries(many.map((d) => [d.menuItemId, 1]));
    const note = saleNote(toLines(basket, many));
    expect(note).toBe('Bán tại quầy: 40 món');
    expect(note.length).toBeLessThanOrEqual(NOTE_MAX);
  });
});

describe('the counter sale screen', () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date(),
  );

  function open() {
    return render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
        }
      >
        <MemoryRouter initialEntries={['/vendor/store/counter']}>
          <Routes>
            <Route path="/vendor/store/counter" element={<CounterSaleScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  const tap = (name: string, times = 1) => {
    for (let i = 0; i < times; i += 1)
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Thêm ${name}, `) }));
  };

  beforeEach(() => {
    vi.resetAllMocks();
    api.stores.mockResolvedValue([{ storefrontId: 1 }]);
    api.menu.mockResolvedValue({ items: MENU, maxItems: 5 });
    api.ledger.mockResolvedValue({
      year: 2026,
      month: 11,
      totals: { online: 0, recorded: 0, total: 0 },
      days: [
        {
          date: today,
          online: 30_000,
          onlineOrders: 1,
          recorded: 55_000,
          total: 85_000,
          entries: [],
        },
      ],
    });
    api.addEntry.mockResolvedValue({ entryId: 77, amount: 45_000 });
    api.voidEntry.mockResolvedValue({ entryId: 77 });
  });

  it('shows every dish as a big button and a sold-out one that cannot be tapped', async () => {
    open();

    expect(await screen.findByRole('button', { name: 'Thêm Bánh mì, 20.000 đ' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Xôi, hết hàng' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đã thu tiền mặt' })).toBeDisabled();
  });

  it("adds up the total as dishes are tapped, and shows today's figures", async () => {
    open();
    await screen.findByRole('button', { name: /^Thêm Bánh mì/ });

    tap('Bánh mì', 2);
    tap('Trà đá');

    expect(screen.getByText('45.000 đ', { selector: '[aria-live]' })).toBeInTheDocument();
    expect(screen.getByText('3 món')).toBeInTheDocument();
    const today = screen.getByRole('region', { name: 'Hôm nay' });
    expect(within(today).getByText('55.000 đ')).toBeInTheDocument();
    expect(within(today).getByText('30.000 đ')).toBeInTheDocument();
    expect(within(today).getByText('85.000 đ')).toBeInTheDocument();
    expect(within(today).getByText(/không phải hoá đơn điện tử/i)).toBeInTheDocument();
  });

  it('records one cash entry with the total and the dishes, then offers to undo it', async () => {
    open();
    await screen.findByRole('button', { name: /^Thêm Bánh mì/ });
    tap('Bánh mì', 2);
    tap('Trà đá');

    fireEvent.click(screen.getByRole('button', { name: 'Đã thu tiền mặt' }));

    await waitFor(() => expect(api.addEntry).toHaveBeenCalledTimes(1));
    expect(api.addEntry).toHaveBeenCalledWith({
      date: today,
      amount: 45_000,
      channel: 'CASH',
      note: 'Bán tại quầy: Bánh mì ×2, Trà đá ×1',
    });
    expect(await screen.findByText('Đã ghi 45.000 đ vào sổ doanh thu')).toBeInTheDocument();
    // Ready for the next customer.
    expect(screen.getByRole('button', { name: 'Đã thu tiền mặt' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Món đang chọn' })).not.toBeInTheDocument();
  });

  it('records a sale once however fast the button is pressed', async () => {
    let finish!: (entry: { entryId: number; amount: number }) => void;
    api.addEntry.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    open();
    await screen.findByRole('button', { name: /^Thêm Bánh mì/ });
    tap('Bánh mì');
    const pay = screen.getByRole('button', { name: 'Đã thu tiền mặt' });

    fireEvent.click(pay);
    fireEvent.click(pay);
    fireEvent.click(pay);
    await act(async () => finish({ entryId: 1, amount: 20_000 }));

    expect(api.addEntry).toHaveBeenCalledTimes(1);
  });

  it('records customer after customer without losing or doubling any', async () => {
    api.addEntry.mockImplementation(async (body: { amount: number }) => ({
      entryId: Math.random(),
      amount: body.amount,
    }));
    open();
    await screen.findByRole('button', { name: /^Thêm Bánh mì/ });

    for (let customer = 1; customer <= 12; customer += 1) {
      tap('Bánh mì', customer % 3 === 0 ? 2 : 1);
      fireEvent.click(screen.getByRole('button', { name: 'Đã thu tiền mặt' }));
      await waitFor(() => expect(api.addEntry).toHaveBeenCalledTimes(customer));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Đã thu tiền mặt' })).toBeDisabled(),
      );
    }

    const amounts = api.addEntry.mock.calls.map(([body]) => body.amount);
    expect(amounts).toEqual([
      20000, 20000, 40000, 20000, 20000, 40000, 20000, 20000, 40000, 20000, 20000, 40000,
    ]);
  });

  it('undoes the sale it just recorded with the reason "Bấm nhầm"', async () => {
    open();
    await screen.findByRole('button', { name: /^Thêm Bánh mì/ });
    tap('Bánh mì', 2);
    tap('Trà đá');
    fireEvent.click(screen.getByRole('button', { name: 'Đã thu tiền mặt' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }));

    await waitFor(() => expect(api.voidEntry).toHaveBeenCalledWith(77, 'Bấm nhầm'));
    await waitFor(() => expect(screen.queryByText(/Đã ghi 45\.000 đ/)).not.toBeInTheDocument());
  });

  it('stops offering the undo after ten seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      open();
      await screen.findByRole('button', { name: /^Thêm Bánh mì/ });
      tap('Bánh mì', 2);
      tap('Trà đá');
      fireEvent.click(screen.getByRole('button', { name: 'Đã thu tiền mặt' }));
      await screen.findByRole('button', { name: 'Hoàn tác' });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_100);
      });

      expect(screen.queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the basket and says so when the entry could not be recorded', async () => {
    api.addEntry.mockRejectedValue(new Error('Không kết nối được máy chủ.'));
    open();
    await screen.findByRole('button', { name: /^Thêm Bánh mì/ });
    tap('Bánh mì');

    fireEvent.click(screen.getByRole('button', { name: 'Đã thu tiền mặt' }));

    expect(await screen.findByText(/Khoản này chưa được ghi, bạn bấm lại nhé/)).toBeInTheDocument();
    expect(screen.getByText('1 món')).toBeInTheDocument();
    expect(screen.queryByText(/Đã ghi/)).not.toBeInTheDocument();
  });

  it('lets a dish be taken off one by one or dropped, and clears the whole basket', async () => {
    open();
    await screen.findByRole('button', { name: /^Thêm Bánh mì/ });
    tap('Bánh mì', 2);
    tap('Trà đá');

    fireEvent.click(screen.getByRole('button', { name: 'Bớt Bánh mì' }));
    expect(screen.getByText('25.000 đ', { selector: '[aria-live]' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ Trà đá' }));
    expect(screen.getByText('20.000 đ', { selector: '[aria-live]' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá hết' }));
    expect(screen.getByText('0 đ', { selector: '[aria-live]' })).toBeInTheDocument();
    expect(api.addEntry).not.toHaveBeenCalled();
  });

  it('asks for a stall and a dish before anything can be sold', async () => {
    api.menu.mockResolvedValue({ items: [], maxItems: 5 });
    open();

    expect(await screen.findByText('Chưa có món để bán')).toBeInTheDocument();
  });

  it('says so when the menu cannot be loaded and offers a retry', async () => {
    api.menu.mockRejectedValue(new Error('Máy chủ bận.'));
    open();

    expect(await screen.findByText('Máy chủ bận.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
  });
});
