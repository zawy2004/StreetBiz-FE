import { useEffect, useState } from 'react';

/**
 * Small motion helpers for the vendor registration screens. No animation
 * library: one-shot moments use the Web Animations API, everything else is a
 * CSS transition, and both stand down under `prefers-reduced-motion` (the
 * global rule in index.css also zeroes CSS durations).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Plays a one-off keyframe animation on an element, if the browser can and the user allows it. */
export function playOnce(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) {
  if (!el || prefersReducedMotion()) return;
  if (typeof (el as HTMLElement).animate !== 'function') return;
  (el as HTMLElement).animate(keyframes, { easing: 'cubic-bezier(.2,.8,.2,1)', ...options });
}

/**
 * False on the first paint, true one frame later: lets a CSS transition run
 * from its "before" state on mount (a line drawing in, a ring filling).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(() => prefersReducedMotion());
  useEffect(() => {
    if (mounted) return;
    if (typeof window.requestAnimationFrame !== 'function') {
      setMounted(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [mounted]);
  return mounted;
}

/** Brings the first field the last submit flagged into view and focuses it. */
export function focusFirstError(root: HTMLElement | null) {
  if (!root) return;
  const target = root.querySelector<HTMLElement>(
    '[aria-invalid="true"], [data-field-error="true"]',
  );
  if (!target) return;
  target.scrollIntoView?.({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  });
  const focusable = target.matches('input, select, textarea, button')
    ? target
    : target.querySelector<HTMLElement>('input, select, textarea, button');
  focusable?.focus({ preventScroll: true });
}
