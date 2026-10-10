import { useEffect, useState } from 'react';

import { prefersReducedMotion } from './schedule-format';

/**
 * False on the first paint, true one frame later: lets a bar or marker start at
 * its resting place and transition to its real position. With reduced motion
 * (or no requestAnimationFrame, as in tests) it is true straight away.
 */
export function useArrived(): boolean {
  const [arrived, setArrived] = useState(
    () => prefersReducedMotion() || typeof requestAnimationFrame !== 'function',
  );
  useEffect(() => {
    if (arrived) return;
    const frame = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(frame);
  }, [arrived]);
  return arrived;
}

/**
 * Counts from 0 to `target` (ease-out cubic) for a receipt total. Display only:
 * the settled value is always `target`, and reduced motion skips the count.
 */
export function useCountUp(target: number, duration = 700): number {
  const instant = prefersReducedMotion() || typeof requestAnimationFrame !== 'function';
  const [value, setValue] = useState(instant ? target : 0);
  useEffect(() => {
    if (instant) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, instant]);
  return value;
}
