/**
 * Pure display helpers for the pricing (W17) and penalty (W18) schedule screens.
 * Nothing here talks to the API or changes what is sent; it only shapes numbers
 * already on screen into pictures and short labels.
 */

const DAY_MINUTES = 24 * 60;

/** "HH:mm" or "HH:mm:ss" -> minutes after midnight; null when empty or malformed. */
export function minutesOf(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':');
  const hours = Number(h);
  const minutes = Number(m ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return Math.min(DAY_MINUTES, Math.max(0, hours * 60 + minutes));
}

/** Share of the day (0..1) for a minute count. */
export function dayShare(minutes: number): number {
  return minutes / DAY_MINUTES;
}

/** "2026-11-01" -> "01/11" for tight chips; the full date stays elsewhere. */
export function shortDateVn(isoDate: string): string {
  const [, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}`;
}

/** "2026-11-01" -> "01/11/2026". */
export function fullDateVn(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Vietnamese thousands with the inline "đ" suffix the receipts use ("1.200.000đ"). */
export function vndInline(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

/**
 * Short money for ruler ticks: "200 nghìn", "1 tr", "2,5 tr". Deliberately never
 * the full "3.000.000đ" form, so a ruler label can't be mistaken for (or collide
 * with) the computed amount printed beside it.
 */
export function compactVnd(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = Math.round((amount / 1_000_000) * 10) / 10;
    return `${millions.toLocaleString('vi-VN')} tr`;
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000).toLocaleString('vi-VN')} nghìn`;
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export type LogScale = {
  lo: number;
  hi: number;
  /** 0..1 position of an amount on the shared ruler. */
  at: (amount: number) => number;
  ticks: number[];
};

const BASE_TICKS = [200_000, 1_000_000, 5_000_000, 20_000_000];

/**
 * One log scale for the whole penalty page (200.000 đ - 20.000.000 đ), widened
 * only when a real bracket falls outside it, so every row reads against the same
 * ruler.
 */
export function makeLogScale(amounts: number[]): LogScale {
  const positive = amounts.filter((a) => a > 0);
  const lo = Math.min(BASE_TICKS[0]!, ...positive);
  const hi = Math.max(BASE_TICKS[BASE_TICKS.length - 1]!, ...positive);
  const logLo = Math.log10(lo);
  const span = Math.log10(hi) - logLo || 1;
  const at = (amount: number) =>
    amount <= 0 ? 0 : Math.min(1, Math.max(0, (Math.log10(amount) - logLo) / span));
  return { lo, hi, at, ticks: BASE_TICKS.filter((t) => t >= lo && t <= hi) };
}

/** True when the viewer asked for reduced motion (false where matchMedia is missing). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
