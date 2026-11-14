/**
 * BUY-07 on the buyer's side: the live sum the complaint form shows while it is filled in.
 * The server is the judge: it takes the posted price from the price history at the purchase
 * time and ignores any price the client could send; this only keeps an obviously unfounded
 * overcharge complaint from being sent.
 */

export const MAX_QUANTITY = 1_000;
export const MAX_CHARGED = 1_000_000_000;
/** A complaint about a purchase is taken within this many days of it. */
export const PURCHASE_WINDOW_DAYS = 7;
/** A phone's clock may run a little ahead of the server's; the server allows the same. */
const CLOCK_SKEW_MS = 5 * 60_000;

export type OverchargeCheck =
  | { state: 'incomplete' }
  | { state: 'not-above'; posted: number; charged: number; difference: number }
  | { state: 'above'; posted: number; charged: number; difference: number };

const wholePositive = (value: number | null | undefined, max: number): value is number =>
  value != null && Number.isSafeInteger(value) && value > 0 && value <= max;

/** Posted price × quantity against the amount charged; incomplete until all three are usable. */
export function checkOvercharge(
  unitPrice: number | null | undefined,
  quantity: number | null | undefined,
  charged: number | null | undefined,
): OverchargeCheck {
  if (
    unitPrice == null ||
    !wholePositive(quantity, MAX_QUANTITY) ||
    !wholePositive(charged, MAX_CHARGED)
  ) {
    return { state: 'incomplete' };
  }
  const posted = unitPrice * quantity;
  const difference = charged - posted;
  return { state: difference > 0 ? 'above' : 'not-above', posted, charged, difference };
}

const VN_OFFSET_MS = 7 * 60 * 60_000;

/** "2026-10-22T08:15" for a `datetime-local` input, as the wall clock in Việt Nam reads it. */
export function toVnLocalInput(date: Date): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 16);
}

/** The instant a Việt Nam wall-clock input means, as ISO with its offset; null when unreadable. */
export function vnLocalInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const iso = `${value}:00+07:00`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

/** The `min` / `max` of the purchase-time input: the last 7 days up to now. */
export function purchaseWindow(now: Date = new Date()): { min: string; max: string } {
  // The input has minute precision: the first whole minute inside the window.
  const earliest = Math.ceil((now.getTime() - PURCHASE_WINDOW_DAYS * 86_400_000) / 60_000) * 60_000;
  return { min: toVnLocalInput(new Date(earliest)), max: toVnLocalInput(now) };
}

/** Why a purchase time cannot be used, or null when it can. */
export function purchaseTimeProblem(value: string, now: Date = new Date()): string | null {
  const iso = vnLocalInputToIso(value);
  if (!iso) return 'Chọn ngày giờ mua.';
  const at = new Date(iso).getTime();
  if (at > now.getTime() + CLOCK_SKEW_MS) return 'Giờ mua không được ở tương lai.';
  if (at < now.getTime() - PURCHASE_WINDOW_DAYS * 86_400_000) {
    return 'Chỉ nhận khiếu nại giá trong 7 ngày kể từ lúc mua.';
  }
  return null;
}
