import {
  NO_FILTERS,
  countSlots,
  hasActiveFilters,
  isHeld,
  overlapsShift,
  slotDisplayState,
  slotMatchesFilters,
  slotMatchesSearch,
} from '@/features/sidewalk-slots/slot-stats';
import { makeSlot } from './slot-fixtures';

const NOW = Date.parse('2026-09-19T08:00:00Z');
const FUTURE = '2026-09-19T08:10:00Z';
const PAST = '2026-09-19T07:50:00Z';

const slot = (overrides: Parameters<typeof makeSlot>[0] extends infer T ? Partial<T> : never = {}) =>
  makeSlot({ slotCode: 'NVL-01', latitude: 16.06, longitude: 108.21, ...overrides });

describe('slotDisplayState', () => {
  it('maps each status, treating an AVAILABLE slot with a live hold as HELD', () => {
    expect(slotDisplayState(slot(), NOW)).toBe('AVAILABLE');
    expect(slotDisplayState(slot({ holdExpiresAt: FUTURE }), NOW)).toBe('HELD');
    expect(slotDisplayState(slot({ slotStatus: 'PENDING_APPLICATION' }), NOW)).toBe('PENDING');
    expect(slotDisplayState(slot({ slotStatus: 'ACTIVE' }), NOW)).toBe('ACTIVE');
    expect(slotDisplayState(slot({ slotStatus: 'SUSPENDED' }), NOW)).toBe('SUSPENDED');
  });

  it('ignores a hold that has already lapsed', () => {
    expect(isHeld({ holdExpiresAt: PAST }, NOW)).toBe(false);
    expect(slotDisplayState(slot({ holdExpiresAt: PAST }), NOW)).toBe('AVAILABLE');
  });
});

describe('countSlots', () => {
  it('buckets every slot exactly once so the tiles add up to the total', () => {
    const slots = [
      slot({ slotId: 1 }),
      slot({ slotId: 2 }),
      slot({ slotId: 3, holdExpiresAt: FUTURE }),
      slot({ slotId: 4, slotStatus: 'PENDING_APPLICATION' }),
      slot({ slotId: 5, slotStatus: 'ACTIVE' }),
      slot({ slotId: 6, slotStatus: 'SUSPENDED' }),
    ];

    const counts = countSlots(slots, NOW);

    expect(counts).toEqual({ total: 6, available: 2, pending: 2, active: 1, suspended: 1 });
    expect(counts.available + counts.pending + counts.active + counts.suspended).toBe(counts.total);
  });

  it('counts nothing for an empty zone', () => {
    expect(countSlots([], NOW)).toEqual({ total: 0, available: 0, pending: 0, active: 0, suspended: 0 });
  });
});

describe('shifts', () => {
  const window = (from: string | null, to: string | null) => ({ availableFrom: from, availableTo: to });

  it('overlaps a shift when the opening hours touch it', () => {
    expect(overlapsShift(window('05:00:00', '22:00:00'), 'MORNING')).toBe(true);
    expect(overlapsShift(window('05:00:00', '22:00:00'), 'AFTERNOON_EVENING')).toBe(true);
    expect(overlapsShift(window('05:00:00', '11:00:00'), 'AFTERNOON_EVENING')).toBe(false);
    expect(overlapsShift(window('16:30:00', '23:00:00'), 'MORNING')).toBe(false);
  });

  it('treats a shift boundary as not overlapping', () => {
    expect(overlapsShift(window('05:00:00', '12:00:00'), 'AFTERNOON_EVENING')).toBe(false);
    expect(overlapsShift(window('12:00:00', '20:00:00'), 'MORNING')).toBe(false);
  });

  it('treats a missing window as the whole day', () => {
    expect(overlapsShift(window(null, null), 'MORNING')).toBe(true);
  });
});

describe('slotMatchesFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(slotMatchesFilters(slot(), NO_FILTERS, NOW)).toBe(true);
  });

  it('filters by display state, so a held slot is not "available"', () => {
    const held = slot({ holdExpiresAt: FUTURE });
    expect(slotMatchesFilters(held, { ...NO_FILTERS, state: 'AVAILABLE' }, NOW)).toBe(false);
    expect(slotMatchesFilters(held, { ...NO_FILTERS, state: 'HELD' }, NOW)).toBe(true);
  });

  it('filters by business category, excluding slots with none', () => {
    const filters = { ...NO_FILTERS, category: 'FOOD_BEVERAGE' as const };
    expect(slotMatchesFilters(slot({ businessCategory: 'FOOD_BEVERAGE' }), filters, NOW)).toBe(true);
    expect(slotMatchesFilters(slot({ businessCategory: 'RETAIL' }), filters, NOW)).toBe(false);
    expect(slotMatchesFilters(slot({ businessCategory: null }), filters, NOW)).toBe(false);
  });

  it('filters by shift using the opening hours', () => {
    const evening = { ...NO_FILTERS, shift: 'AFTERNOON_EVENING' as const };
    expect(slotMatchesFilters(slot({ availableFrom: '16:30:00', availableTo: '23:00:00' }), evening, NOW)).toBe(true);
    expect(slotMatchesFilters(slot({ availableFrom: '05:00:00', availableTo: '11:00:00' }), evening, NOW)).toBe(false);
  });

  it('requires every switched-on amenity, and ANDs the filters together', () => {
    const both = { ...NO_FILTERS, power: true, water: true };
    expect(slotMatchesFilters(slot({ hasPower: true, hasWater: true }), both, NOW)).toBe(true);
    expect(slotMatchesFilters(slot({ hasPower: true, hasWater: false }), both, NOW)).toBe(false);
    expect(hasActiveFilters(both)).toBe(true);
  });
});

describe('slotMatchesSearch', () => {
  it('matches the slot code or the zone name, ignoring case and surrounding space', () => {
    expect(slotMatchesSearch({ slotCode: 'NVL-08', zoneName: 'Đường Nguyễn Văn Linh' }, ' nvl-08 ')).toBe(true);
    expect(slotMatchesSearch({ slotCode: 'NVL-08', zoneName: 'Đường Nguyễn Văn Linh' }, 'văn linh')).toBe(true);
    expect(slotMatchesSearch({ slotCode: 'NVL-08', zoneName: 'Đường Nguyễn Văn Linh' }, 'PXL')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(slotMatchesSearch({ slotCode: 'X', zoneName: 'Y' }, '  ')).toBe(true);
  });
});
