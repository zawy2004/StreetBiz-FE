import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '@/features/business-registrations/components/ui-motion';

/**
 * Counts from 0 up to `target` once, the first time the data is `ready`; later
 * refetches show the new value straight away. Reduced motion shows the final
 * value with no count.
 */
export function useCountUp(target: number, ready: boolean, durationMs: number): number {
  const played = useRef(false);
  const [value, setValue] = useState(target);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!ready || played.current) return;
    played.current = true;
    if (
      target <= 0 ||
      prefersReducedMotion() ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      return;
    }
    let frame = 0;
    const start = performance.now();
    setRunning(true);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic, matching --ease-out closely enough for a number.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      setRunning(false);
    };
  }, [ready, target, durationMs]);

  return running ? value : target;
}
