/**
 * "Bán tại quầy": the basket a vendor builds with one tap per dish while serving a walk-up customer
 * who pays cash. Pure functions, so the rules (a cap per dish, the note that goes into the revenue
 * book) are testable without a screen.
 */
import type { SellerMenuItem } from '@/core/api/seller-store-api';

/** How many of one dish a single sale may hold; a fat-fingered "999" is not a sale. */
export const MAX_PER_DISH = 99;

/** How long a recorded sale can still be undone with one tap. */
export const UNDO_MS = 10_000;

/** The revenue book keeps a note of at most 300 characters. */
export const NOTE_MAX = 300;

/** Dish id to quantity. A dish with no quantity is not in the basket. */
export type Basket = Readonly<Record<number, number>>;

export type BasketLine = {
  item: SellerMenuItem;
  quantity: number;
  amount: number;
};

/** A dish can be sold only while it is on offer; a sold-out or hidden one is shown but not tappable. */
export const isSellable = (item: SellerMenuItem): boolean =>
  item.availabilityStatus === 'AVAILABLE';

export function add(basket: Basket, itemId: number): Basket {
  const quantity = Math.min(MAX_PER_DISH, (basket[itemId] ?? 0) + 1);
  return { ...basket, [itemId]: quantity };
}

/** One fewer; the dish leaves the basket at zero. */
export function remove(basket: Basket, itemId: number): Basket {
  const next = { ...basket };
  const quantity = (next[itemId] ?? 0) - 1;
  if (quantity > 0) next[itemId] = quantity;
  else delete next[itemId];
  return next;
}

/** The dish leaves the basket whatever its quantity. */
export function clearDish(basket: Basket, itemId: number): Basket {
  const next = { ...basket };
  delete next[itemId];
  return next;
}

/**
 * The basket as lines, in menu order. A dish that has left the menu or stopped being sellable
 * since it was tapped is dropped: the total must match what can actually be sold now.
 */
export function toLines(basket: Basket, items: readonly SellerMenuItem[]): BasketLine[] {
  return items
    .filter((item) => isSellable(item) && (basket[item.menuItemId] ?? 0) > 0)
    .map((item) => {
      const quantity = basket[item.menuItemId]!;
      return { item, quantity, amount: item.unitPrice * quantity };
    });
}

export const totalOf = (lines: readonly BasketLine[]): number =>
  lines.reduce((sum, line) => sum + line.amount, 0);

export const countOf = (lines: readonly BasketLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

/**
 * The note written into the revenue book: "Bán tại quầy: Bánh mì ×2, Trà đá ×1". Over the book's
 * 300-character limit it falls back to a count, so a long sale is still recorded.
 */
export function saleNote(lines: readonly BasketLine[]): string {
  const detail = `Bán tại quầy: ${lines.map((l) => `${l.item.name} ×${l.quantity}`).join(', ')}`;
  return detail.length <= NOTE_MAX ? detail : `Bán tại quầy: ${countOf(lines)} món`;
}
