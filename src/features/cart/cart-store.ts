import { create } from 'zustand';

import type { CartItem } from '@/mocks/types';

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
};

/**
 * CART-01: cart is scoped to a single storefront — adding an item from a
 * different storefront replaces the cart (matching the "single storefront
 * per cart" constraint) rather than silently merging or blocking.
 */
export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  add: (item) => {
    const { items } = get();
    const sameStorefront = items.length === 0 || items[0]?.storefrontId === item.storefrontId;
    if (!sameStorefront) {
      set({ items: [item] });
      return;
    }
    const existing = items.find((i) => i.menuItemId === item.menuItemId);
    if (existing) {
      set({
        items: items.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + item.quantity } : i,
        ),
      });
    } else {
      set({ items: [...items, item] });
    }
  },
  updateQuantity: (menuItemId, quantity) =>
    set((s) => ({
      items:
        quantity <= 0
          ? s.items.filter((i) => i.menuItemId !== menuItemId)
          : s.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
    })),
  remove: (menuItemId) =>
    set((s) => ({ items: s.items.filter((i) => i.menuItemId !== menuItemId) })),
  clear: () => set({ items: [] }),
}));
