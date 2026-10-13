import { describe, expect, it } from 'vitest';

import {
  deviceKind,
  groupByDay,
  groupPhone,
  passedCount,
  relativeTime,
} from '@/features/account-management/components/account-format';
import { dayLabel, layoutThread } from '@/features/chat/components/thread-format';
import type { ChatMessage } from '@/features/chat/types/chat.types';

// 10/10/2026 09:00 in Asia/Ho_Chi_Minh (UTC+7).
const NOW = new Date('2026-10-10T02:00:00Z');

describe('account display helpers', () => {
  it('phrases relative times', () => {
    expect(relativeTime('2026-10-10T01:59:30Z', NOW)).toBe('vừa xong');
    expect(relativeTime('2026-10-10T01:55:00Z', NOW)).toBe('5 phút trước');
    expect(relativeTime('2026-10-07T02:00:00Z', NOW)).toBe('3 ngày trước');
    expect(relativeTime(null, NOW)).toBe('');
    expect(relativeTime('not a date', NOW)).toBe('');
  });

  it('groups by calendar day in Asia/Ho_Chi_Minh, keeping order', () => {
    const items = [
      { id: 1, at: '2026-10-09T17:01:00Z' }, // 00:01 on 10/10 in Vietnam: today
      { id: 2, at: '2026-10-09T16:59:00Z' }, // 23:59 on 09/10 in Vietnam: yesterday
      { id: 3, at: '2026-09-30T10:00:00Z' },
    ];
    const groups = groupByDay(items, (item) => item.at, NOW);
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['Hôm nay', [1]],
      ['Hôm qua', [2]],
      ['Trước đó', [3]],
    ]);
  });

  it('reads a phone number in 4-3-3 groups and leaves other values alone', () => {
    expect(groupPhone('0905000002')).toBe('0905 000 002');
    expect(groupPhone('+84 905')).toBe('+84 905');
  });

  it('draws the right device from its readable name', () => {
    expect(deviceKind('Safari trên iPhone')).toBe('phone');
    expect(deviceKind('Chrome trên Android')).toBe('phone');
    expect(deviceKind('Safari trên iPad')).toBe('tablet');
    expect(deviceKind('Chrome trên Windows')).toBe('laptop');
    expect(deviceKind(null)).toBe('laptop');
  });

  it('counts the BR-59 rules a password meets', () => {
    expect(passedCount('')).toBe(0);
    expect(passedCount('Abcdefg1!')).toBe(6);
    expect(passedCount('abc')).toBe(2);
  });
});

function message(id: number, sentAt: string, fromMe: boolean): ChatMessage {
  return {
    messageId: id,
    conversationId: 1,
    senderUserId: fromMe ? 9 : 5,
    senderName: fromMe ? 'Khách' : 'Quầy',
    fromMe,
    body: `tin ${id}`,
    sentAt,
    readAt: null,
  };
}

describe('thread layout', () => {
  it('labels days and never reorders messages', () => {
    const messages = [
      message(1, '2026-10-05T03:00:00Z', false),
      message(2, '2026-10-09T03:00:00Z', true),
      message(3, '2026-10-10T01:00:00Z', false),
    ];
    const items = layoutThread(messages, NOW);
    expect(items.map((item) => item.message.messageId)).toEqual([1, 2, 3]);
    expect(items.map((item) => item.dayBreak)).toEqual([
      dayLabel(messages[0]!.sentAt, NOW),
      'Hôm qua',
      'Hôm nay',
    ]);
    expect(items[0]!.dayBreak).toMatch(/^Thứ Hai, 05\/10$/i);
  });

  it('joins messages from the same side within five minutes, and only those', () => {
    const items = layoutThread(
      [
        message(1, '2026-10-10T01:00:00Z', true),
        message(2, '2026-10-10T01:03:00Z', true),
        message(3, '2026-10-10T01:20:00Z', true),
        message(4, '2026-10-10T01:21:00Z', false),
      ],
      NOW,
    );
    expect(items.map((item) => [item.joinsPrevious, item.joinsNext])).toEqual([
      [false, true],
      [true, false],
      [false, false],
      [false, false],
    ]);
  });
});
