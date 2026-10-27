import { beforeEach, describe, expect, it } from 'vitest';

import { useCartStore } from '@/features/cart/cart-store';

const dish = (menuItemId: string, storefrontId = 'store-1', quantity = 1) => ({
  menuItemId,
  storefrontId,
  quantity,
});

const items = () => useCartStore.getState().items;

describe('cart store (CART-01)', () => {
  beforeEach(() => useCartStore.getState().clear());

  it('starts empty', () => {
    expect(items()).toEqual([]);
  });

  it('adds new dishes from the same storefront side by side', () => {
    useCartStore.getState().add(dish('a'));
    useCartStore.getState().add(dish('b'));

    expect(items().map((i) => i.menuItemId)).toEqual(['a', 'b']);
  });

  it('adds the quantity when the dish is already in the cart', () => {
    useCartStore.getState().add(dish('a', 'store-1', 1));
    useCartStore.getState().add(dish('a', 'store-1', 2));

    expect(items()).toEqual([dish('a', 'store-1', 3)]);
  });

  it('replaces the cart when a dish from another storefront is added (one storefront per cart)', () => {
    useCartStore.getState().add(dish('a', 'store-1'));
    useCartStore.getState().add(dish('b', 'store-1'));
    useCartStore.getState().add(dish('c', 'store-2', 4));

    expect(items()).toEqual([dish('c', 'store-2', 4)]);
  });

  it('sets a quantity and keeps the other lines', () => {
    useCartStore.getState().add(dish('a'));
    useCartStore.getState().add(dish('b'));
    useCartStore.getState().updateQuantity('a', 5);

    expect(items()).toEqual([dish('a', 'store-1', 5), dish('b')]);
  });

  it.each([0, -1])('removes the line when the quantity is set to %i', (quantity) => {
    useCartStore.getState().add(dish('a'));
    useCartStore.getState().add(dish('b'));
    useCartStore.getState().updateQuantity('a', quantity);

    expect(items().map((i) => i.menuItemId)).toEqual(['b']);
  });

  it('ignores a quantity update for a dish that is not in the cart', () => {
    useCartStore.getState().add(dish('a'));
    useCartStore.getState().updateQuantity('zzz', 3);

    expect(items()).toEqual([dish('a')]);
  });

  it('removes one dish and clears everything', () => {
    useCartStore.getState().add(dish('a'));
    useCartStore.getState().add(dish('b'));
    useCartStore.getState().remove('a');
    expect(items().map((i) => i.menuItemId)).toEqual(['b']);

    useCartStore.getState().clear();
    expect(items()).toEqual([]);
  });

  it('keeps the note of the dish that was added first when the quantity grows', () => {
    useCartStore.getState().add({ ...dish('a'), note: 'Không rau mùi' });
    useCartStore.getState().add(dish('a', 'store-1', 2));

    expect(items()[0]).toMatchObject({ quantity: 3, note: 'Không rau mùi' });
  });
});
