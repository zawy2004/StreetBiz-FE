import { formatVnd } from '@/components/common/formatVnd';
import { env } from '@/core/config/env';

const TZ = 'Asia/Ho_Chi_Minh';

const stampParts = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TZ,
});

/**
 * Server instants come with a zone (`Z`); a date-time without one is read as UTC, the way
 * the ward screens read them. Null when missing or unreadable.
 */
export function serverInstant(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso);
  const date = new Date(!hasZone && iso.includes('T') ? `${iso}Z` : iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parts(date: Date): Record<string, string> {
  return Object.fromEntries(stampParts.formatToParts(date).map((p) => [p.type, p.value]));
}

/** "08:15 22/10/2026" in Việt Nam time, the stamp printed on a price board; null when unreadable. */
export function formatBoardStamp(iso: string | null | undefined): string | null {
  const date = serverInstant(iso);
  if (!date) return null;
  const p = parts(date);
  return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
}

/** "22/10/2026" in Việt Nam time; null when unreadable. */
export function formatVnDay(iso: string | null | undefined): string | null {
  const date = serverInstant(iso);
  if (!date) return null;
  const p = parts(date);
  return `${p.day}/${p.month}/${p.year}`;
}

/** The day a due instant closes on: due times are the end of a Vietnamese day, so step back a tick. */
export function formatDueDay(iso: string | null | undefined): string | null {
  const date = serverInstant(iso);
  return date ? formatVnDay(new Date(date.getTime() - 1).toISOString()) : null;
}

/** "25.000 đ / ổ": a posted price always names its unit. */
export function priceWithUnit(price: number, unit: string | null | undefined): string {
  const trimmed = unit?.trim();
  return trimmed ? `${formatVnd(price)} / ${trimmed}` : formatVnd(price);
}

/** "(0236) 1022" from the configured digits; a number of another shape is shown as given. */
export function cityPhoneLabel(digits: string = env.cityFeedbackPhone ?? '02361022'): string {
  const clean = digits.replace(/\D/g, '');
  const match = /^(0\d{3})(\d{4})$/.exec(clean);
  return match ? `(${match[1]}) ${match[2]}` : digits;
}

/** `tel:` link for the city's 1022 line. */
export function cityPhoneHref(digits: string = env.cityFeedbackPhone ?? '02361022'): string {
  return `tel:${digits.replace(/[^\d+]/g, '')}`;
}

/** The city's online feedback portal (Góp ý Đà Nẵng). */
export function cityFeedbackUrl(): string {
  return env.cityFeedbackUrl ?? 'https://gopy.danang.gov.vn';
}
