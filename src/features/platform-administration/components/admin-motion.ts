import { useEffect, useRef, useState, type RefObject } from 'react';

import { prefersReducedMotion } from './admin-format';

/**
 * Presentation-only motion helpers. Each one settles on the real value at once
 * when the user prefers less motion, or when there is no browser to animate in.
 */

const played = new Set<string>();

/** True only the first time `key` is asked for in this page session (motion that should not replay). */
export function firstTimeThisSession(key: string): boolean {
  if (played.has(key)) return false;
  played.add(key);
  return true;
}

/** Counts from 0 up to `target` once, over `duration` ms; returns `target` straight away when `play` is false. */
export function useCountUp(target: number, play: boolean, duration = 400): number {
  const [startedWith] = useState(() => play && !prefersReducedMotion());
  const [value, setValue] = useState(startedWith ? 0 : target);
  const done = useRef(!startedWith);

  useEffect(() => {
    if (done.current || typeof requestAnimationFrame !== 'function') {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else done.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/**
 * False on the first paint and true on the next frame, so a CSS transition can run
 * from the starting state. Starts true (no motion) when `play` is false.
 */
export function useEntered(play = true): boolean {
  const [entered, setEntered] = useState(() => !play || prefersReducedMotion());
  useEffect(() => {
    if (entered) return;
    if (typeof requestAnimationFrame !== 'function') {
      setEntered(true);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [entered]);
  return entered;
}

/** Whether a horizontal rail is wider than its box (then it becomes a focusable scroll region). */
export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure when the rail's content changes
  }, [ref, ...deps]);
  return overflowing;
}
