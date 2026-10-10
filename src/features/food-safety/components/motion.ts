/**
 * Small motion helpers for one-off moments (a bar filling, a sheet sliding
 * in, a number counting up). They use the Web Animations API, so nothing is
 * added to the global stylesheet, and they do nothing when the reader asked
 * for reduced motion or the browser cannot animate (tests).
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';

/** Plays `keyframes` on `el` once; a no-op under reduced motion. */
export function playOnce(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) {
  if (!el || prefersReducedMotion()) return;
  const node = el as HTMLElement;
  if (typeof node.animate !== 'function') return;
  node.animate(keyframes, { easing: EASE_OUT, fill: 'backwards', ...options });
}

/** True where a number may count up frame by frame. */
export function canCount(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function' &&
    !prefersReducedMotion()
  );
}
