import type { ReportPeriod } from '../../../useWardReports';

/**
 * Pure helpers for the ward collection report (W19). Everything is derived from
 * the period the screen already asks for and the report it already loaded.
 */

/** The periods the ward's money screens offer (the report and the receipt list). */
export type PeriodKey = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90_DAYS' | 'CUSTOM';

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: 'THIS_MONTH', label: 'Tháng này' },
  { value: 'LAST_MONTH', label: 'Tháng trước' },
  { value: 'LAST_90_DAYS', label: '90 ngày' },
  { value: 'CUSTOM', label: 'Tuỳ chọn' },
];

/** Local calendar date, not toISOString(): that is UTC and would be yesterday before 07:00. */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function periodFor(key: Exclude<PeriodKey, 'CUSTOM'>, today: Date): ReportPeriod {
  const year = today.getFullYear();
  const month = today.getMonth();
  switch (key) {
    case 'LAST_MONTH':
      return { from: isoDay(new Date(year, month - 1, 1)), to: isoDay(new Date(year, month, 0)) };
    case 'LAST_90_DAYS':
      return { from: isoDay(new Date(year, month, today.getDate() - 89)), to: isoDay(today) };
    default:
      return { from: isoDay(new Date(year, month, 1)), to: isoDay(today) };
  }
}

/** "2026-11-07" as "07/11/2026". */
export const displayDay = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

/** Calendar days in an ISO `YYYY-MM-DD` range, both ends included. */
export function periodDays(from: string, to: string): number {
  const day = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y!, m! - 1, d!) / 86_400_000;
  };
  return Math.max(0, day(to) - day(from) + 1);
}

/** Days in the calendar month of an ISO day. */
export function daysInMonth(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

/** The most frequent labels, most common first (ties keep first-seen order). */
export function topLabels(items: { violationLabel: string }[], limit = 5) {
  const counts = new Map<string, number>();
  for (const item of items)
    counts.set(item.violationLabel, (counts.get(item.violationLabel) ?? 0) + 1);
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Whole-percent shares of two amounts that add up to 100 (0/0 when both are zero). */
export function shares(a: number, b: number): [number, number] {
  const total = a + b;
  if (total <= 0) return [0, 0];
  const first = Math.round((a / total) * 100);
  return [first, 100 - first];
}
