import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A number that counts from where it was to `target` (from 0 on first mount),
 * for display only: the real value is always what the caller renders for
 * screen readers and tests. Lands straight on the value under reduced motion.
 */
export function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      from.current = target;
      setValue(target);
      return;
    }
    const start = from.current;
    let raf = 0;
    let t0: number | null = null;
    const step = (now: number) => {
      t0 ??= now;
      const t = Math.min(1, (now - t0) / durationMs);
      const next = Math.round(start + (target - start) * easeOut(t));
      from.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

/** False on the first paint, true right after: lets a bar grow from 0 by CSS transition. */
export function useGrown() {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') {
      setGrown(true);
      return;
    }
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return grown;
}
