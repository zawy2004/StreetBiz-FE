import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A number that runs from its last value (or `from` on first show) to the new
 * one over `duration` ms, eased out. Display only: callers keep the exact value
 * in the accessible text. Jumps straight to the end under reduced motion or
 * where requestAnimationFrame is missing.
 */
export function useRollingNumber(
  target: number,
  { duration = 200, from }: { duration?: number; from?: number } = {},
) {
  const [shown, setShown] = useState(from ?? target);
  const last = useRef(from ?? target);

  useEffect(() => {
    const start = last.current;
    if (start === target) return;
    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      last.current = target;
      setShown(target);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (time: number) => {
      const progress = Math.min((time - began) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const value = progress === 1 ? target : Math.round(start + (target - start) * eased);
      last.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}
