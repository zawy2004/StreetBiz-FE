import { describe, expect, it } from 'vitest';

import {
  formatWait,
  minutesSince,
  TICKET_ITEM_LIMIT,
  ticketItemsShown,
  waitTone,
} from '@/features/orders/components/order-format';

describe('minutesSince', () => {
  const now = Date.parse('2026-10-27T10:00:00Z');

  it('counts whole minutes', () => {
    expect(minutesSince('2026-10-27T09:47:30Z', now)).toBe(12);
  });

  it('is never negative when the phone clock runs behind', () => {
    expect(minutesSince('2026-10-27T10:05:00Z', now)).toBe(0);
  });
});

describe('formatWait', () => {
  it.each([
    [0, 'vừa xong'],
    [1, '1 phút'],
    [59, '59 phút'],
    [60, '1 giờ'],
    [125, '2 giờ 5 phút'],
    [24 * 60 - 1, '23 giờ 59 phút'],
    [24 * 60, '1 ngày'],
    [3 * 24 * 60 + 500, '3 ngày'],
  ])('%i minutes reads "%s"', (minutes, text) => {
    expect(formatWait(minutes)).toBe(text);
  });
});

describe('waitTone', () => {
  it.each([
    [0, 'calm'],
    [4, 'calm'],
    [5, 'warn'],
    [9, 'warn'],
    [10, 'late'],
    [180, 'late'],
  ])('%i minutes is %s', (minutes, tone) => {
    expect(waitTone(minutes)).toBe(tone);
  });
});

describe('ticketItemsShown', () => {
  it('shows every item up to one past the limit, because folding a single item saves nothing', () => {
    for (let count = 0; count <= TICKET_ITEM_LIMIT + 1; count += 1) {
      expect(ticketItemsShown(count)).toBe(count);
    }
  });

  it('folds the rest once there are two or more extra items', () => {
    expect(ticketItemsShown(TICKET_ITEM_LIMIT + 2)).toBe(TICKET_ITEM_LIMIT);
    expect(ticketItemsShown(20)).toBe(TICKET_ITEM_LIMIT);
  });
});
