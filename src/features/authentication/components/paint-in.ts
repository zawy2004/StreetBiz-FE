import { useEffect, useState } from 'react';

/**
 * Presentation helpers for the one-off entrance moments of the public pages
 * (landing hero, auth panel). index.css owns the keyframes; these only decide
 * when a CSS transition starts, and skip motion for people who asked for less.
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * False on the first paint and true two frames later (once `ready`), so
 * elements can transition from their "before" look to their "after" look once.
 */
export function usePaintIn(ready = true): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!ready || on) return;
    if (typeof window.requestAnimationFrame !== 'function') {
      const timer = window.setTimeout(() => setOn(true), 0);
      return () => window.clearTimeout(timer);
    }
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setOn(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [ready, on]);

  return on;
}

/** Plays a short Web Animation once, when the browser has the API and motion is welcome. */
export function playOnce(
  element: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): void {
  if (!element || prefersReducedMotion()) return;
  const target = element as HTMLElement;
  if (typeof target.animate !== 'function') return;
  target.animate(keyframes, options);
}

/** Transition delay that collapses to nothing under reduced motion. */
export function motionDelay(ms: number, reduced: boolean): string {
  return reduced ? '0ms' : `${ms}ms`;
}

export const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';

/** Public food photos (Wikimedia, CC; see public/images/food/CREDITS.md). */
export function foodPhoto(key: string): string {
  return `${import.meta.env.BASE_URL}images/food/${key}.jpg`;
}
