/**
 * Display-only date helpers for the ward review screens. Every new date line
 * reads in Asia/Ho_Chi_Minh; the strings the screens already showed keep their
 * own formatting (see each screen).
 */
const TZ = 'Asia/Ho_Chi_Minh';

const todayFormat = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TZ,
});
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TZ,
});
const dueFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  timeZone: TZ,
});
const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

/**
 * Server timestamps sometimes come without a zone; like the case screen, treat a
 * date-time without one as UTC. A bare date stays a date.
 */
export function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso);
  const value = !hasZone && iso.includes('T') ? `${iso}Z` : iso;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Thứ Sáu, 10/10/2026" (first letter upper-cased). */
export function formatTodayVi(now: Date = new Date()): string {
  const text = todayFormat.format(now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dayNumber(date: Date): number {
  const [y, m, d] = dayKeyFormat.format(date).split('-').map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 86_400_000;
}

/** Whole calendar days (Ho Chi Minh) from `date` to now; negative when in the future. */
export function daysAgo(date: Date, now: Date = new Date()): number {
  return Math.round(dayNumber(now) - dayNumber(date));
}

/** "Nộp hôm nay" / "Nộp hôm qua" / "Nộp 4 ngày trước"; null when unparseable. */
export function formatWaitVi(iso: string | null | undefined, verb = 'Nộp'): string | null {
  const date = parseServerDate(iso);
  if (!date) return null;
  const days = daysAgo(date);
  if (days <= 0) return `${verb} hôm nay`;
  if (days === 1) return `${verb} hôm qua`;
  return `${verb} ${days} ngày trước`;
}

/** "Hạn xử lý 12/10"; null when unparseable. */
export function formatDueVi(iso: string | null | undefined): string | null {
  const date = parseServerDate(iso);
  return date ? `Hạn xử lý ${dueFormat.format(date)}` : null;
}

/** "09/10/2026 08:12" in Ho Chi Minh time; null when unparseable. */
export function formatDateTimeVi(iso: string | null | undefined): string | null {
  const date = parseServerDate(iso);
  return date ? dateTimeFormat.format(date) : null;
}

/** "3 giờ trước" / "25 phút trước" / "2 ngày trước"; null when unparseable. */
export function formatAgoVi(iso: string | null | undefined, now: Date = new Date()): string | null {
  const date = parseServerDate(iso);
  if (!date) return null;
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 60) return minutes <= 1 ? 'vừa xong' : `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

/** True when the viewer asked the system for less motion (false where unknown). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** True where animation can run at all: a browser with matchMedia and rAF, motion allowed. */
export function canAnimate(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    typeof window.requestAnimationFrame === 'function' &&
    !prefersReducedMotion()
  );
}
