import { useEffect, useRef } from 'react';

/**
 * Calls `refresh` every `intervalMs` while the tab is visible, and once when it becomes visible
 * again after being hidden for at least one interval. For screens that load with plain effects
 * instead of React Query; `refresh` should update the data quietly, without a loading state.
 */
export function useVisiblePolling(refresh: () => void, intervalMs: number, enabled = true): void {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    let hiddenAt: number | null = document.visibilityState === 'hidden' ? Date.now() : null;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') latest.current();
    }, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= intervalMs) latest.current();
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
