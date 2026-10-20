import {
  directionsUrl,
  formatDistance,
  ratingText,
  todayHoursText,
  vietnamWeekday,
  weeklySchedule,
} from '@/features/buyer-discovery/discovery-format';
import { makeStorefront } from './discovery-fixtures';

describe('formatDistance', () => {
  it('uses metres under a kilometre and kilometres with one decimal above', () => {
    expect(formatDistance(48.5)).toBe('49 m');
    expect(formatDistance(999)).toBe('999 m');
    expect(formatDistance(1234)).toBe('1,2 km');
    expect(formatDistance(6042)).toBe('6 km');
  });

  it('says nothing when the distance is unknown', () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(undefined)).toBeNull();
  });
});

describe('todayHoursText', () => {
  it('lists the windows of today', () => {
    const storefront = makeStorefront({
      todayHours: [
        { dayOfWeek: 6, opensAt: '06:00', closesAt: '10:00' },
        { dayOfWeek: 6, opensAt: '16:00', closesAt: '21:00' },
      ],
    });
    expect(todayHoursText(storefront)).toBe('06:00–10:00, 16:00–21:00');
  });

  it('tells a closed storefront with no window today it rests, and stays quiet for one with no hours published', () => {
    expect(todayHoursText(makeStorefront({ todayHours: [], isOpenNow: false }))).toBe('Nghỉ hôm nay');
    expect(todayHoursText(makeStorefront({ todayHours: [], isOpenNow: true }))).toBeNull();
  });
});

describe('weeklySchedule', () => {
  it('is null when no hours are published', () => {
    expect(weeklySchedule([])).toBeNull();
  });

  it('lists all seven days Monday first, with rest days empty and windows in time order', () => {
    const schedule = weeklySchedule([
      { dayOfWeek: 6, opensAt: '16:00', closesAt: '21:00' },
      { dayOfWeek: 6, opensAt: '06:00', closesAt: '10:00' },
      { dayOfWeek: 1, opensAt: '06:00', closesAt: '10:00' },
    ]);

    expect(schedule?.map((d) => d.label)).toEqual([
      'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật',
    ]);
    expect(schedule?.[0]?.ranges).toEqual(['06:00–10:00']);
    expect(schedule?.[5]?.ranges).toEqual(['06:00–10:00', '16:00–21:00']);
    expect(schedule?.[6]?.ranges).toEqual([]);
  });
});

describe('vietnamWeekday', () => {
  it('follows the UTC+7 calendar, numbering Sunday 7', () => {
    // Saturday 17:30 UTC is already 00:30 on Sunday in Vietnam.
    expect(vietnamWeekday(new Date('2026-09-19T17:30:00Z'))).toBe(7);
    expect(vietnamWeekday(new Date('2026-09-19T03:00:00Z'))).toBe(6);
    expect(vietnamWeekday(new Date('2026-09-21T00:00:00Z'))).toBe(1);
  });
});

describe('ratingText and directionsUrl', () => {
  it('formats a rating or says there is none', () => {
    expect(ratingText(4.5, 3)).toBe('4.5 ★ (3)');
    expect(ratingText(null, 0)).toBe('Chưa có đánh giá');
  });

  it('points a maps link at the coordinates', () => {
    expect(directionsUrl(16.06, 108.21)).toBe('https://www.google.com/maps/dir/?api=1&destination=16.06,108.21');
  });
});
