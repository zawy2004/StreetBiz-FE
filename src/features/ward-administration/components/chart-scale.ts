/**
 * Axis helpers for the collection charts: a clean top value and evenly spaced ticks, and money
 * written short enough for an axis ("1,5 tr", "800 N").
 */

/** The smallest "nice" number (1, 2, 2.5, 5 × 10^k) at or above `value`. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

/** The smallest step of 1, 2 or 5 × 10^k at or above `value`: every multiple of it is a round number. */
function niceStep(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

/**
 * Round ticks from 0 to just above `max`, about `count` steps apart. The step is chosen first and
 * the top follows from it, so every tick reads as a whole figure ("2 tr", "4 tr"), never a
 * quarter that rounding would misprint ("1,25 tr" shown as "1,3 tr").
 */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = niceStep(max / count);
  const steps = Math.ceil(max / step);
  return Array.from({ length: steps + 1 }, (_, index) => step * index);
}

const one = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

/** "0", "800 N", "1,5 tr", "2 tỷ": VND short enough for an axis tick or a column cap. */
export function compactVnd(amount: number): string {
  if (amount >= 1_000_000_000) return `${one(amount / 1_000_000_000)} tỷ`;
  if (amount >= 1_000_000) return `${one(amount / 1_000_000)} tr`;
  if (amount >= 1_000) return `${one(amount / 1_000)} N`;
  return String(Math.round(amount));
}

export const monthLabel = (year: number, month: number) => `T${month}/${String(year).slice(2)}`;
