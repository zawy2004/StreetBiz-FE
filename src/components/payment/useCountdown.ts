import { useEffect, useState } from 'react';

function secondsLeft(target: number): number {
  return Math.max(0, Math.ceil((target - Date.now()) / 1000));
}

/**
 * Whole seconds left until `expiresAt` (an ISO timestamp), counting down once a second and
 * stopping at 0. `null` when there is no usable deadline: nothing to count, nothing to warn about.
 */
export function useCountdown(expiresAt: string | null | undefined): number | null {
  const target = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const [seconds, setSeconds] = useState<number | null>(
    Number.isNaN(target) ? null : secondsLeft(target),
  );

  useEffect(() => {
    if (Number.isNaN(target)) {
      setSeconds(null);
      return;
    }
    setSeconds(secondsLeft(target));
    const timer = window.setInterval(() => {
      const left = secondsLeft(target);
      setSeconds(left);
      if (left === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return seconds;
}

/** 1805 -> "30:05". */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
