import {
  deadlineText,
  formatAreaSqm,
  formatCountdown,
  formatHours,
  formatShortVnd,
  formatSize,
  hkdCode,
  secondsUntil,
  toDms,
} from '@/features/sidewalk-slots/slot-format';

describe('toDms', () => {
  it('renders WGS84 degrees, minutes and seconds with hemisphere letters', () => {
    // 16.060558 = 16° 3' 38.0088"; 108.214412 = 108° 12' 51.9"
    expect(toDms(16.060558, 108.214412)).toBe(`16°03'38.0"N 108°12'51.9"E`);
  });

  it('uses S and W for negative coordinates', () => {
    expect(toDms(-33.5, -70.25)).toBe(`33°30'00.0"S 70°15'00.0"W`);
  });

  it('carries a seconds value that rounds up to 60 instead of printing 60.0"', () => {
    // 0.999999 deg = 59.99994 min -> 59' 59.9964" -> rounds to 60.0"
    expect(toDms(10.999999, 20)).toBe(`11°00'00.0"N 20°00'00.0"E`);
  });
});

describe('countdown', () => {
  const now = Date.parse('2026-09-19T08:00:00Z');

  it('counts whole seconds up to the expiry and never goes negative', () => {
    expect(secondsUntil('2026-09-19T08:12:34Z', now)).toBe(754);
    expect(secondsUntil('2026-09-19T07:59:00Z', now)).toBe(0);
  });

  it('rounds a partial second up so the display never shows 00:00 while still held', () => {
    expect(secondsUntil('2026-09-19T08:00:00.400Z', now)).toBe(1);
  });

  it('formats as mm:ss', () => {
    expect(formatCountdown(754)).toBe('12:34');
    expect(formatCountdown(5)).toBe('00:05');
    expect(formatCountdown(0)).toBe('00:00');
  });
});

describe('hkdCode', () => {
  it('pads the registration id to four digits', () => {
    expect(hkdCode(7)).toBe('HKD-0007');
    expect(hkdCode(10002)).toBe('HKD-10002');
  });
});

describe('sizes and hours', () => {
  it('formats size and area only when both dimensions are known', () => {
    expect(formatSize(1.8, 2.5)).toBe('1,8 × 2,5 m');
    expect(formatAreaSqm(1.8, 2.5)).toBe('4,5 m²');
    expect(formatSize(null, 2.5)).toBeNull();
    expect(formatAreaSqm(1.8, null)).toBeNull();
  });

  it('trims seconds from opening hours and falls back to the whole day', () => {
    expect(formatHours('05:00:00', '22:00:00')).toBe('05:00 – 22:00');
    expect(formatHours(null, null)).toBe('Cả ngày');
  });
});

describe('deadlineText', () => {
  const now = Date.parse('2026-09-19T08:00:00');

  it('counts the days left, with the deadline day itself still open', () => {
    expect(deadlineText('2026-09-25', now)).toBe('Hạn nộp: còn 6 ngày');
    expect(deadlineText('2026-09-19', now)).toBe('Hạn nộp: hôm nay');
  });

  it('says so once the deadline has passed', () => {
    expect(deadlineText('2026-09-18', now)).toBe('Đã hết hạn nộp');
  });
});

describe('formatShortVnd', () => {
  it('shortens to whole thousands', () => {
    expect(formatShortVnd(30000)).toBe('30k');
    expect(formatShortVnd(95500)).toBe('96k');
    expect(formatShortVnd(500)).toBe('500');
  });
});
