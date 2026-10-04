import { describe, expect, it } from 'vitest';

import type { FeeItemDto, PenaltyListDto } from '@/core/api';
import { buildTodos, daysUntil } from '@/features/vendor-home/todos';

const today = new Date(2026, 9, 4); // 04/10/2026, local time

function fee(
  id: number,
  dueDate: string,
  itemStatus = 'PENDING',
  periodLabel = 'Kỳ 1/3 · Tháng 10/2026',
): FeeItemDto {
  return {
    feeItemId: id,
    contractId: 1,
    slotCode: 'NVL-08',
    periodLabel,
    dueDate,
    amount: 900_000,
    itemStatus,
    paidAt: null,
  };
}

const penalty: PenaltyListDto = {
  penaltyId: 7,
  violationId: 3,
  violationType: 'ENCROACHMENT',
  violationLabel: 'Lấn chiếm lòng đường',
  slotCode: 'NVL-08',
  amount: 500_000,
  penaltyStatus: 'UNPAID',
  issuedAt: '2026-09-28T08:00:00Z',
  paidAt: null,
};

describe('buildTodos', () => {
  it('counts calendar days in local time', () => {
    expect(daysUntil('2026-10-04', today)).toBe(0);
    expect(daysUntil('2026-10-11', today)).toBe(7);
    expect(daysUntil('2026-09-29', today)).toBe(-5);
  });

  it('puts the most overdue fee first, then penalties, then fees due soon, and folds later fees into a summary', () => {
    const { todos, later } = buildTodos(
      [],
      [
        fee(1, '2027-01-10', 'PENDING', 'Kỳ 3/3 · Tháng 01/2027'),
        fee(2, '2026-10-11'),
        fee(3, '2026-09-29', 'OVERDUE', 'Kỳ 2/3 · Tháng 09/2026'),
        fee(4, '2026-11-10', 'PENDING', 'Kỳ 2/3 · Tháng 11/2026'),
        fee(5, '2026-08-10', 'PAID'),
      ],
      [penalty],
      today,
    );

    expect(todos.map((t) => t.key)).toEqual(['fee-3', 'penalty-7', 'fee-2']);
    expect(todos[0]).toMatchObject({
      title: 'Phí tháng 09/2026',
      note: 'Quá hạn 5 ngày',
      tone: 'danger',
    });
    expect(todos[1]).toMatchObject({
      title: 'Biên bản phạt',
      note: 'Lấn chiếm lòng đường',
      amount: 500_000,
    });
    expect(todos[2]).toMatchObject({ note: 'Còn 7 ngày · hạn 11/10', tone: 'pending' });
    expect(later).toEqual({ count: 2, total: 1_800_000, nextDueDate: '2026-11-10' });
  });

  it('treats a PENDING fee past its due date as overdue', () => {
    const { todos } = buildTodos([], [fee(9, '2026-10-01')], [], today);
    expect(todos[0]).toMatchObject({ tone: 'danger', note: 'Quá hạn 3 ngày' });
  });

  it('shows the ward’s reason on a registration that needs more evidence', () => {
    const { todos } = buildTodos(
      [
        {
          registrationId: 42,
          displayName: 'Xôi gà Bà Năm',
          registrationStatus: 'MORE_INFORMATION_REQUIRED',
          reviewDecisionReason: 'Ảnh CCCD bị mờ',
        },
      ],
      [],
      [],
      today,
    );
    expect(todos).toEqual([
      expect.objectContaining({
        title: 'Bổ sung hồ sơ: Xôi gà Bà Năm',
        note: 'Ảnh CCCD bị mờ',
        to: '/vendor/registrations/42',
      }),
    ]);
  });
});
