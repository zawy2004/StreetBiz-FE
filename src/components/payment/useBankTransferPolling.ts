import { useEffect, useRef } from 'react';

/** How often a waiting transfer is checked with the backend while its QR is on screen. */
export const BANK_TRANSFER_POLL_MS = 5000;

/**
 * Calls `poll` every `intervalMs` while `active`, skipping ticks while the tab
 * is hidden. The webhook settles the payment on the server; this only notices.
 */
export function useBankTransferPolling(
  active: boolean,
  poll: () => void,
  intervalMs = BANK_TRANSFER_POLL_MS,
) {
  const pollRef = useRef(poll);
  pollRef.current = poll;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') pollRef.current();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
}
