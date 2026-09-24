import { lazy, type ComponentType } from 'react';

/**
 * Route-level code splitting for named screen exports.
 *
 * `lazyScreen(() => import('@/features/cart/screens'), 'CartScreen')` loads the
 * whole feature barrel on first visit, so every screen of a feature lands in
 * one chunk and the initial bundle only carries what the first page needs.
 */
export function lazyScreen<M extends Record<string, unknown>, K extends keyof M & string>(
  load: () => Promise<M>,
  name: K,
) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}
