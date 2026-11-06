import { describe, expect, it } from 'vitest';

import type { ApiRegistration, FeeItemDto, PenaltyListDto } from '@/core/api';
import {
  buildTodos,
  FEE_DUE_SOON_DAYS,
  payableSummary,
  upcomingFees,
  vietnamToday,
  type SlotsNearApproval,
} from '@/features/vendor-home/todos';

const TODAY = '2026-11-03';

const registration = (over: Partial<ApiRegistration>) =>
  ({
    registrationId: 1,
    displayName: 'Bánh mì Cô Lan',
    registrationStatus: 'APPROVED',
    reviewedAt: null,
    reviewDecisionReason: null,
    ...over,
  }) as ApiRegistration;

const fee = (over: Partial<FeeItemDto>): FeeItemDto => ({
  feeItemId: 10,
  contractId: 1,
  slotCode: 'NVL-01',
  periodLabel: 'Kỳ 1/3',
  dueDate: '2026-11-08',
  amount: 990_000,
  itemStatus: 'PENDING',
  paidAt: null,
  ...over,
});

const penalty = (over: Partial<PenaltyListDto>): PenaltyListDto => ({
  penaltyId: 5,
  violationId: 9,
  violationType: 'PRICE_NOT_POSTED',
  violationLabel: 'Không niêm yết giá',
  slotCode: 'NVL-01',
  amount: 500_000,
  penaltyStatus: 'UNPAID',
  issuedAt: '2026-10-01T08:00:00Z',
  paidAt: null,
  ...over,
});

describe('buildTodos', () => {
  it('lists only what the vendor can act on', () => {
    const todos = buildTodos(
      [
        registration({ registrationId: 1, registrationStatus: 'APPROVED' }),
        registration({ registrationId: 2, registrationStatus: 'SUBMITTED' }),
      ],
      [fee({ feeItemId: 1, itemStatus: 'PAID' }), fee({ feeItemId: 2, itemStatus: 'CANCELLED' })],
      [
        penalty({ penaltyId: 1, penaltyStatus: 'PAID' }),
        penalty({ penaltyId: 2, penaltyStatus: 'WAIVED' }),
      ],
    );

    expect(todos).toEqual([]);
  });

  it('keeps the order registrations, slots, fees, penalties', () => {
    const near: SlotsNearApproval = {
      registrationId: 1,
      displayName: 'Bánh mì Cô Lan',
      count: 0,
      nearest: null,
    };
    const todos = buildTodos(
      [registration({ registrationId: 7, registrationStatus: 'MORE_INFORMATION_REQUIRED' })],
      [fee({ feeItemId: 11 })],
      [penalty({ penaltyId: 12 })],
      near,
      TODAY,
    );

    expect(todos.map((t) => t.kind)).toEqual(['registration', 'slots', 'fee', 'penalty']);
    expect(todos.map((t) => t.key)).toEqual(['registration-7', 'slots-1', 'fee-11', 'penalty-12']);
  });

  it('sends a registration that needs more information to its detail page with the ward reason', () => {
    const [todo] = buildTodos(
      [
        registration({
          registrationId: 42,
          registrationStatus: 'MORE_INFORMATION_REQUIRED',
          reviewedAt: '2026-10-10T03:00:00Z',
          reviewDecisionReason: 'Thiếu ảnh mặt sau CCCD',
        }),
      ],
      [],
      [],
    );

    expect(todo).toMatchObject({
      title: 'Bổ sung hồ sơ: Bánh mì Cô Lan',
      path: '/vendor/registrations/42',
      amount: null,
      note: 'Thiếu ảnh mặt sau CCCD',
      overdue: false,
    });
  });

  it('marks an OVERDUE instalment overdue and keeps its amount, date and slot', () => {
    const todos = buildTodos(
      [],
      [
        fee({ feeItemId: 1, itemStatus: 'OVERDUE', amount: 1_200_000, dueDate: '2026-10-08' }),
        fee({ feeItemId: 2, itemStatus: 'PENDING', slotCode: '' }),
      ],
      [],
      null,
      TODAY,
    );

    expect(todos[0]).toMatchObject({
      kind: 'fee',
      overdue: true,
      amount: 1_200_000,
      date: '2026-10-08',
      slotCode: 'NVL-01',
      path: '/vendor/finance/fees/1/payment',
    });
    expect(todos[1]).toMatchObject({ overdue: false, slotCode: null });
  });

  it('accepts both the live (UNPAID) and the mock (PENDING) penalty status', () => {
    const todos = buildTodos(
      [],
      [],
      [
        penalty({ penaltyId: 1, penaltyStatus: 'UNPAID' }),
        penalty({ penaltyId: 2, penaltyStatus: 'PENDING', violationLabel: '' }),
      ],
    );

    expect(todos.map((t) => t.path)).toEqual([
      '/vendor/finance/penalties/1/payment',
      '/vendor/finance/penalties/2/payment',
    ]);
    expect(todos[0]?.note).toBe('Không niêm yết giá');
    expect(todos[1]?.note).toBeNull();
  });

  describe('free slots near an approved registration', () => {
    it('opens the workspace on the nearest slot and counts them in the title', () => {
      const [todo] = buildTodos([], [], [], {
        registrationId: 3,
        displayName: 'Xôi Bà Năm',
        count: 4,
        nearest: { zoneId: 2, slotId: 31, zoneName: 'Đường Nguyễn Văn Linh' },
      });

      expect(todo?.title).toBe('Hồ sơ đã duyệt — có 4 ô trống gần chỗ bạn bán');
      expect(todo?.path).toBe('/vendor/slots?zone=2&slot=31');
      expect(todo?.note).toBe('Đường Nguyễn Văn Linh');
    });

    it('falls back to the slot list when no free slot is known', () => {
      const [todo] = buildTodos([], [], [], {
        registrationId: 3,
        displayName: 'Xôi Bà Năm',
        count: 0,
        nearest: null,
      });

      expect(todo?.title).toBe('Hồ sơ đã duyệt — chọn ô vỉa hè để xin thuê');
      expect(todo?.path).toBe('/vendor/slots');
      expect(todo?.note).toBeNull();
    });
  });
});

describe('fees due now versus later', () => {
  it('leaves instalments due more than a week ahead off the board', () => {
    const todos = buildTodos(
      [],
      [
        fee({ feeItemId: 1, dueDate: '2026-11-10' }), // exactly 7 days ahead: due now
        fee({ feeItemId: 2, dueDate: '2026-11-11' }), // 8 days ahead: later
        fee({ feeItemId: 3, dueDate: '2027-07-13', periodLabel: 'Kỳ 13/13' }),
      ],
      [],
      null,
      TODAY,
    );

    expect(FEE_DUE_SOON_DAYS).toBe(7);
    expect(todos.map((t) => t.key)).toEqual(['fee-1']);
  });

  it('always lists an overdue instalment, however old, before the ones still due', () => {
    const todos = buildTodos(
      [],
      [
        fee({ feeItemId: 1, dueDate: '2026-11-05', itemStatus: 'PENDING' }),
        fee({ feeItemId: 2, dueDate: '2026-10-23', itemStatus: 'OVERDUE' }),
        fee({ feeItemId: 3, dueDate: '2026-11-04', itemStatus: 'PENDING' }),
        fee({ feeItemId: 4, dueDate: '2026-09-23', itemStatus: 'OVERDUE' }),
      ],
      [],
      null,
      TODAY,
    );

    expect(todos.map((t) => t.key)).toEqual(['fee-4', 'fee-2', 'fee-3', 'fee-1']);
  });

  it('does not count later instalments in the amount to pay now', () => {
    const fees = [
      fee({ feeItemId: 1, amount: 990_000, dueDate: '2026-10-08', itemStatus: 'OVERDUE' }),
      fee({ feeItemId: 2, amount: 990_000, dueDate: '2027-01-13' }),
      fee({ feeItemId: 3, amount: 165_000, dueDate: '2027-07-13' }),
    ];

    expect(payableSummary(buildTodos([], fees, [], null, TODAY)).total).toBe(990_000);
    expect(upcomingFees(fees, TODAY)).toEqual({
      count: 2,
      total: 1_155_000,
      nextDueDate: '2027-01-13',
    });
  });

  it('reports nothing upcoming when every unpaid instalment is due now or already paid', () => {
    const fees = [
      fee({ feeItemId: 1, dueDate: '2026-11-04' }),
      fee({ feeItemId: 2, dueDate: '2027-01-13', itemStatus: 'PAID' }),
    ];

    expect(upcomingFees(fees, TODAY)).toEqual({ count: 0, total: 0, nextDueDate: null });
  });

  it('reads today in Vietnam time, not UTC', () => {
    // 20:00 UTC on 2 Nov is already 03:00 on 3 Nov in Hà Nội.
    expect(vietnamToday(new Date('2026-11-02T20:00:00Z'))).toBe('2026-11-03');
  });
});

describe('payableSummary', () => {
  it('adds up only the money and counts each kind', () => {
    const todos = buildTodos(
      [registration({ registrationStatus: 'MORE_INFORMATION_REQUIRED' })],
      [
        fee({ feeItemId: 1, amount: 990_000 }),
        fee({ feeItemId: 2, amount: 165_000, itemStatus: 'OVERDUE' }),
      ],
      [penalty({ amount: 500_000 })],
      null,
      TODAY,
    );

    expect(payableSummary(todos)).toEqual({
      total: 1_655_000,
      fees: 2,
      penalties: 1,
      registrations: 1,
    });
  });

  it('is all zeros for an empty list', () => {
    expect(payableSummary([])).toEqual({ total: 0, fees: 0, penalties: 0, registrations: 0 });
  });
});
