import type { PenaltyScheduleItem } from '../../../ward-api';

/**
 * Whole days left until `iso` (rounded up), negative once it has passed. Display only:
 * the server alone decides whether the giải trình window is still open.
 */
export function daysUntil(iso: string, now: number = Date.now()): number {
  return Math.ceil((Date.parse(iso) - now) / 86_400_000);
}

/** The "(khung 2.000.000 - 3.000.000đ)" a legal basis ends with, as numbers; null when absent. Mirrors
 * LegalBasisText.TryParseBracket on the server, which alone enforces it. */
export function parseFineBracket(legalBasis: string | null | undefined): { min: number; max: number } | null {
  // Same pattern as the server's BracketPattern: "(khung <min> - <max>đ)", dots as thousands.
  const match = /\(khung\s+([\d.]+)\s*-\s*([\d.]+)\s*đ\)/.exec(legalBasis ?? '');
  if (!match) return null;
  const toNumber = (text: string) => Number(text.replace(/\./g, ''));
  return { min: toNumber(match[1] ?? ''), max: toNumber(match[2] ?? '') };
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
