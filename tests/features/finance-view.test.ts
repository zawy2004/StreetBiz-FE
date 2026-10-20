import type { FeeItemDto, InvoiceDto, PaymentTransactionDto } from '@/core/api';
import {
  daysFromToday,
  daysSinceLatest,
  feeUrgency,
  groupByMonth,
  groupFees,
  hcmDay,
  invoiceKindLine,
  ledgerTotals,
  monthTotals,
  paymentStats,
  penaltyTotals,
  weekBuckets,
} from '@/features/fee-schedules/finance-view';

// 10:00 on Saturday 10/10/2026 in Ho Chi Minh City.
const NOW = new Date('2026-10-10T03:00:00Z');

const fee = (over: Partial<FeeItemDto>): FeeItemDto => ({
  feeItemId: 1,
  contractId: 1,
  slotCode: 'NVL-01',
  periodLabel: 'Kỳ 1/3',
  dueDate: '2026-10-20',
  amount: 1_040_000,
  itemStatus: 'PENDING',
  paidAt: null,
  ...over,
});

const payment = (over: Partial<PaymentTransactionDto>): PaymentTransactionDto => ({
  transactionId: 1,
  purpose: 'RENTAL_FEE',
  provider: 'MOMO',
  amount: 100_000,
  transactionStatus: 'SUCCESS',
  referenceLabel: 'Kỳ 1/3',
  slotCode: 'NVL-01',
  createdAt: '2026-10-01T03:00:00Z',
  callbackReceivedAt: null,
  ...over,
});

describe('calendar days in Asia/Ho_Chi_Minh', () => {
  it('keeps a bare date and moves a UTC timestamp to the Vietnamese day', () => {
    expect(hcmDay('2026-10-20')).toBe('2026-10-20');
    expect(hcmDay('2026-09-22T17:30:00Z')).toBe('2026-09-23');
  });

  it('counts days to a due date from the calendar day, not from the clock', () => {
    expect(daysFromToday('2026-10-04', NOW)).toBe(-6);
    expect(daysFromToday('2026-10-10', NOW)).toBe(0);
    expect(daysFromToday('2026-10-22', NOW)).toBe(12);
  });
});

describe('fee urgency and grouping', () => {
  it('says how late or how close a payable fee is, and nothing once paid', () => {
    expect(feeUrgency(fee({ dueDate: '2026-10-04', itemStatus: 'OVERDUE' }), NOW)).toEqual({
      text: 'Quá hạn 6 ngày',
      tone: 'danger',
    });
    expect(feeUrgency(fee({ dueDate: '2026-10-10' }), NOW)?.text).toBe('Đến hạn hôm nay');
    expect(feeUrgency(fee({ dueDate: '2026-10-22' }), NOW)).toEqual({
      text: 'Còn 12 ngày',
      tone: 'neutral',
    });
    expect(feeUrgency(fee({ itemStatus: 'PAID' }), NOW)).toBeNull();
  });

  it('puts overdue first, then the nearest due date, and paid ones apart', () => {
    const { due, settled } = groupFees([
      fee({ feeItemId: 1, dueDate: '2026-11-03' }),
      fee({ feeItemId: 2, dueDate: '2026-09-03', itemStatus: 'PAID' }),
      fee({ feeItemId: 3, dueDate: '2026-10-04', itemStatus: 'OVERDUE' }),
      fee({ feeItemId: 4, dueDate: '2026-10-20' }),
      fee({ feeItemId: 5, dueDate: '2026-08-03', itemStatus: 'PAID' }),
    ]);
    expect(due.map((f) => f.feeItemId)).toEqual([3, 4, 1]);
    expect(settled.map((f) => f.feeItemId)).toEqual([2, 5]);
  });
});

describe('grouping by month', () => {
  it('groups by the Vietnamese month, latest first, across years', () => {
    const items = [
      { id: 'a', at: '2026-09-27T01:00:00Z' },
      { id: 'b', at: '2026-08-31T17:30:00Z' }, // already 1/9 in Ho Chi Minh City
      { id: 'c', at: '2025-12-15T01:00:00Z' },
      { id: 'd', at: '2026-08-15T01:00:00Z' },
    ];
    const groups = groupByMonth(items, (i) => i.at);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Tháng 9/2026', ['a', 'b']],
      ['Tháng 8/2026', ['d']],
      ['Tháng 12/2025', ['c']],
    ]);
    expect(groups[2]?.year).toBe(2025);
  });
});

describe('invoices', () => {
  const invoice = (over: Partial<InvoiceDto>): InvoiceDto => ({
    invoiceId: 1,
    invoiceNumber: 'HD-2026-000001',
    kind: 'RENTAL_FEE',
    amount: 1_000_000,
    issuedAt: '2026-09-27T01:00:00Z',
    periodLabel: 'Kỳ 1/3 · Tháng 09/2026',
    ...over,
  });

  it('names what an invoice was for', () => {
    expect(invoiceKindLine(invoice({}))).toBe('Phí thuê ô · Kỳ 1/3 · Tháng 09/2026');
    expect(invoiceKindLine(invoice({ periodLabel: null }))).toBe('Phí thuê ô');
    expect(invoiceKindLine(invoice({ kind: 'PENALTY' }))).toBe('Tiền phạt');
  });

  it('splits the ledger total between fees and penalties', () => {
    expect(ledgerTotals([invoice({}), invoice({ kind: 'PENALTY', amount: 500_000 })])).toEqual({
      count: 2,
      total: 1_500_000,
      fee: 1_000_000,
      penalty: 500_000,
    });
  });
});

describe('payment history', () => {
  it('only adds up successful payments', () => {
    const stats = paymentStats([
      payment({ amount: 100_000 }),
      payment({ amount: 200_000, transactionStatus: 'FAILED' }),
      payment({ amount: 300_000, transactionStatus: 'PENDING' }),
      payment({ amount: 400_000 }),
    ]);
    expect(stats).toMatchObject({ successTotal: 500_000, success: 2, failed: 1, pending: 1 });
  });

  it('sums six months ending this month, oldest first', () => {
    const months = monthTotals(
      [
        payment({ amount: 100_000, createdAt: '2026-10-01T03:00:00Z' }),
        payment({ amount: 50_000, createdAt: '2026-08-02T03:00:00Z' }),
        payment({ amount: 70_000, createdAt: '2026-08-03T03:00:00Z', transactionStatus: 'FAILED' }),
        payment({ amount: 999_000, createdAt: '2026-01-02T03:00:00Z' }),
      ],
      NOW,
    );
    expect(months.map((m) => [m.key, m.total, m.current])).toEqual([
      ['2026-05', 0, false],
      ['2026-06', 0, false],
      ['2026-07', 0, false],
      ['2026-08', 50_000, false],
      ['2026-09', 0, false],
      ['2026-10', 100_000, true],
    ]);
  });
});

describe('violations', () => {
  it('counts clean days from the latest notice, by the Vietnamese calendar day', () => {
    expect(daysSinceLatest([], NOW)).toBeNull();
    expect(
      daysSinceLatest(
        [{ recordedAt: '2026-09-01T03:00:00Z' }, { recordedAt: '2026-10-01T13:04:48Z' }],
        NOW,
      ),
    ).toBe(9);
    // 00:30 on 10/10 in Ho Chi Minh City, still 9/10 in UTC: that is today.
    expect(daysSinceLatest([{ recordedAt: '2026-10-09T17:30:00Z' }], NOW)).toBe(0);
  });

  it('buckets the last twelve Monday-to-Sunday weeks, this week last', () => {
    const weeks = weekBuckets(
      [
        { recordedAt: '2026-10-05T03:00:00Z' }, // Monday of this week
        { recordedAt: '2026-10-04T03:00:00Z' }, // Sunday of last week
        { recordedAt: '2026-09-30T03:00:00Z' },
        { recordedAt: '2026-01-01T03:00:00Z' }, // too old
      ],
      NOW,
    );
    expect(weeks).toHaveLength(12);
    expect(weeks[11]).toEqual({ start: '2026-10-05', end: '2026-10-11', count: 1 });
    expect(weeks[10]).toEqual({ start: '2026-09-28', end: '2026-10-04', count: 2 });
    expect(weeks[0]?.start).toBe('2026-07-20');
    expect(weeks.reduce((sum, w) => sum + w.count, 0)).toBe(3);
  });

  it('adds up penalty money by where it stands, unpaid only from UNPAID', () => {
    expect(
      penaltyTotals([
        { penaltyAmount: 1_000_000, penaltyStatus: 'UNPAID' },
        { penaltyAmount: 500_000, penaltyStatus: 'PAID' },
        { penaltyAmount: 750_000, penaltyStatus: 'WAIVED' },
        { penaltyAmount: 250_000, penaltyStatus: 'CANCELLED' },
        { penaltyAmount: null, penaltyStatus: null },
      ]),
    ).toEqual({
      unpaid: { amount: 1_000_000, count: 1 },
      paid: { amount: 500_000, count: 1 },
      closed: { amount: 1_000_000, count: 2 },
    });
  });
});
