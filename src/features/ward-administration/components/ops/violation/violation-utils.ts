import type { PenaltyScheduleItem } from '../../../ward-api';

/**
 * Whole days left until `iso` (rounded up), negative once it has passed. Display only:
 * the server alone decides whether the giải trình window is still open.
 */
export function daysUntil(iso: string, now: number = Date.now()): number {
  return Math.ceil((Date.parse(iso) - now) / 86_400_000);
}

/** Penalty schedules split by whether a fine can be issued from them (a legal basis is set). */
export function groupSchedules(schedules: PenaltyScheduleItem[]) {
  return {
    withBasis: schedules.filter((s) => s.legalBasis),
    withoutBasis: schedules.filter((s) => !s.legalBasis),
  };
}

/** Lower-case, without Vietnamese tone marks, for a forgiving client-side filter. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}
