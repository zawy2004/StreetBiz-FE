import type { VendorComment } from './community-api';

const DAY_MS = 86_400_000;
const VIETNAM_OFFSET_MS = 7 * 3_600_000;

/** The calendar day (days since 1970-01-01) a moment falls on in Vietnam (UTC+7). */
function vietnamDay(moment: Date): number {
  return Math.floor((moment.getTime() + VIETNAM_OFFSET_MS) / DAY_MS);
}

/** A date-only "YYYY-MM-DD" is that calendar day; a timestamp is the Vietnam day it falls on. */
function dayOf(iso: string): number | null {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (plain) return Math.floor(Date.UTC(+plain[1]!, +plain[2]! - 1, +plain[3]!) / DAY_MS);
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : vietnamDay(parsed);
}

/**
 * Whole days from today (Vietnam calendar) to `endDateIso`: 0 on the last day,
 * negative once it has passed, null when the date cannot be read.
 */
export function daysUntil(
  endDateIso: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!endDateIso) return null;
  const end = dayOf(endDateIso);
  return end == null ? null : end - vietnamDay(now);
}

/**
 * Human words for the two vendor types the platform knows; any other code is
 * shown as it is (unlike `vendorTypeLabel`, which files every unknown code as itinerant).
 */
export function vendorTypeText(code: string): string {
  if (code === 'FIXED_STOREFRONT') return 'Cửa hàng cố định';
  if (code === 'ITINERANT') return 'Bán hàng lưu động';
  return code;
}

/** How many of the loaded reviews gave 5, 4, 3, 2 and 1 stars (in that order). */
export function ratingDistribution(comments: readonly Pick<VendorComment, 'rating'>[]): number[] {
  return [5, 4, 3, 2, 1].map(
    (stars) => comments.filter((comment) => Math.round(comment.rating ?? 0) === stars).length,
  );
}
