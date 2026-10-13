import type { RentalChoice } from '@/core/api/seller-store-api';
import type { Order } from '@/features/orders/types/order.types';
import { buyerVisibility } from '@/features/storefronts/menu-view';
import { lateCount, providerLabel, tallyItems } from '@/features/storefronts/orders-view';
import {
  bestBucket,
  fillDailyBuckets,
  presetRange,
  refundRate,
  toUtc,
} from '@/features/storefronts/sales-view';
import { contractFor, eligibilityReason } from '@/features/storefronts/store-view';

const contract = (contractId: number, extra: Partial<RentalChoice> = {}): RentalChoice => ({
  contractId,
  applicationId: contractId,
  slotCode: `NVL-0${contractId}`,
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  contractStatus: 'ACTIVE',
  ...extra,
});

describe('store helpers', () => {
  it('finds a stall’s contract by id only', () => {
    expect(contractFor({ contractId: 2 }, [contract(1), contract(2)])?.slotCode).toBe('NVL-02');
    expect(contractFor({ contractId: 9 }, [contract(1)])).toBeUndefined();
  });

  it('explains why no stall can be opened', () => {
    expect(eligibilityReason([], '2026-10-10')).toBe('Chưa có hợp đồng thuê ô đang hiệu lực');
    expect(eligibilityReason([contract(1, { startDate: '2026-11-01' })], '2026-10-10')).toBe(
      'Hợp đồng ô NVL-01 có hiệu lực từ 01/11/2026',
    );
    expect(eligibilityReason([contract(1)], '2026-10-10')).toBeNull();
  });
});

describe('menu visibility', () => {
  it('leaves out dishes waiting on ATTP or hidden, and flags a paused stall', () => {
    const result = buyerVisibility(
      [
        { availabilityStatus: 'AVAILABLE', foodSafetyStatus: 'APPROVED' },
        { availabilityStatus: 'SOLD_OUT', foodSafetyStatus: 'NOT_REQUIRED' },
        { availabilityStatus: 'AVAILABLE', foodSafetyStatus: 'MISSING' },
        { availabilityStatus: 'AVAILABLE', foodSafetyStatus: 'PENDING' },
        { availabilityStatus: 'HIDDEN', foodSafetyStatus: 'NOT_REQUIRED' },
      ],
      'PAUSED',
    );
    expect(result).toEqual({
      visible: 2,
      total: 5,
      soldOut: 1,
      needsAttp: 1,
      pending: 1,
      hidden: 1,
      storePaused: true,
    });
  });
});

const order = (id: number, extra: Partial<Order> = {}): Order => ({
  orderId: id,
  orderCode: `SB-${id}`,
  customerName: 'Khách',
  orderStatus: 'PLACED',
  storefront: { storefrontId: 1, storefrontName: 'Quán', imageUrl: null },
  subtotalAmount: 0,
  totalAmount: 0,
  paymentProvider: 'MOMO',
  paymentStatus: 'SUCCESS',
  placedAt: '2026-10-01T07:18:00Z',
  createdAt: '2026-10-01T07:18:00Z',
  items: [],
  statusHistory: [],
  ...extra,
});

const item = (itemName: string, quantity: number) => ({
  orderItemId: quantity,
  menuItemId: 1,
  itemName,
  unitPrice: 10_000,
  quantity,
  lineTotal: 10_000 * quantity,
});

describe('kitchen helpers', () => {
  it('adds up dishes across the shown tickets, most first', () => {
    expect(
      tallyItems([
        order(1, { items: [item('Bánh mì', 2), item('Xôi', 1)] }),
        order(2, { items: [item('Bánh mì', 3)] }),
      ]),
    ).toEqual([
      { itemName: 'Bánh mì', quantity: 5 },
      { itemName: 'Xôi', quantity: 1 },
    ]);
  });

  it('counts only new orders waiting 10 minutes or more', () => {
    const now = Date.parse('2026-10-01T07:30:00Z');
    expect(
      lateCount(
        [
          order(1),
          order(2, { placedAt: '2026-10-01T07:25:00Z' }),
          order(3, { orderStatus: 'ACCEPTED' }),
        ],
        now,
      ),
    ).toBe(1);
  });

  it('writes wallets as people do', () => {
    expect(providerLabel('MOMO')).toBe('MoMo');
    expect(providerLabel('ZALOPAY')).toBe('ZaloPay');
    expect(providerLabel('VNPAY')).toBe('VNPAY');
  });
});

describe('sales helpers', () => {
  const bucket = (key: string, netSales: number) => ({
    key,
    completedOrderCount: netSales ? 1 : 0,
    grossSales: netSales,
    refundedAmount: 0,
    netSales,
  });

  it('fills the missing days and keeps the ones the server sent', () => {
    const filled = fillDailyBuckets([bucket('2026-09-30', 60_000)], '2026-09-29', '2026-10-01');
    expect(filled.map((b) => [b.key, b.netSales])).toEqual([
      ['2026-09-29', 0],
      ['2026-09-30', 60_000],
      ['2026-10-01', 0],
    ]);
    const weeks = [bucket('2026-W40', 10)];
    expect(fillDailyBuckets(weeks, '2026-09-01', '2026-10-01')).toBe(weeks);
  });

  it('picks the best bucket and never divides by zero', () => {
    expect(bestBucket([bucket('a', 5), bucket('b', 9), bucket('c', 9)])?.key).toBe('b');
    expect(bestBucket([bucket('a', 0)])).toBeUndefined();
    expect(refundRate({ grossSales: 0, refundedAmount: 0 })).toBeNull();
    expect(refundRate({ grossSales: 200, refundedAmount: 50 })).toBe(25);
  });

  it('keeps the range bounds the screen always sent', () => {
    expect(toUtc('2026-10-10')).toBe('2026-10-09T17:00:00.000Z');
    expect(toUtc('2026-10-10', true)).toBe('2026-10-10T16:59:59.999Z');
    const now = new Date(2026, 9, 10, 12);
    expect(presetRange('thisMonth', now)).toEqual({ fromDate: '2026-10-01', toDate: '2026-10-10' });
    expect(presetRange('lastMonth', now)).toEqual({ fromDate: '2026-09-01', toDate: '2026-09-30' });
    expect(presetRange('week', now)).toEqual({ fromDate: '2026-10-03', toDate: '2026-10-10' });
  });
});
