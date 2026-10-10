import { useEffect, useRef, useState } from 'react';

import { canCount } from './motion';

/**
 * A number that counts from its previous value to the new one. The visible
 * figure is decorative while it runs; the final value is always in the text
 * a screen reader gets.
 */
export function CountUp({
  value,
  format,
  duration = 600,
  className,
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(() => (canCount() ? 0 : value));
  // What is on screen now, so a new value counts on from there.
  const current = useRef(shown);

  useEffect(() => {
    const start = current.current;
    if (start === value || !canCount()) {
      current.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (time: number) => {
      const t = Math.min(1, (time - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t >= 1 ? value : Math.round(start + (value - start) * eased);
      current.current = next;
      setShown(next);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
