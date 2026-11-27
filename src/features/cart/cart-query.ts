import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { commerceApi, type CommerceCart } from '@/core/api';
import { useAuthStore } from '@/store/auth-store';

/**
 * The buyer's draft carts: one per stall they have added dishes at (`/api/cart/all`). A stall's
 * cart is addressed by `?store=<storefrontId>` on the cart and checkout screens.
 */
export const CARTS_KEY = ['commerce', 'carts'] as const;

export function useCarts() {
  const isCustomer = useAuthStore((s) => s.user?.role_code === 'CUSTOMER');
  return useQuery({
    queryKey: CARTS_KEY,
    queryFn: commerceApi.carts,
    enabled: isCustomer,
  });
}

/** The stall named by `?store=`, or null when the address names none. */
export function useStoreParam(): number | null {
  const [params] = useSearchParams();
  const id = Number(params.get('store'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** The cart of the named stall; with no stall named, the only cart there is (null when several). */
export function pickCart(carts: CommerceCart[], storefrontId: number | null): CommerceCart | null {
  if (storefrontId !== null) return carts.find((cart) => cart.storefrontId === storefrontId) ?? null;
  return carts.length === 1 ? carts[0]! : null;
}

/** The list after a mutation returned the stall's cart (null or empty: the cart is gone). */
export function putCart(
  carts: CommerceCart[],
  storefrontId: number,
  next: CommerceCart | null | undefined,
): CommerceCart[] {
  if (!next || next.items.length === 0) return carts.filter((c) => c.storefrontId !== storefrontId);
  return carts.some((c) => c.storefrontId === storefrontId)
    ? carts.map((c) => (c.storefrontId === storefrontId ? next : c))
    : [next, ...carts];
}
