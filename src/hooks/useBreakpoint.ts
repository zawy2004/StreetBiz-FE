import { useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

/** Live result of a media query; false where matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => matches(query),
    () => false,
  );
}

/** True when the viewport is wide enough for a fixed sidebar layout. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
