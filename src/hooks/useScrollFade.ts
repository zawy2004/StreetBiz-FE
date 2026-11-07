import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

const FADE_PX = 28;

/**
 * Fades the edge of a sideways scroller where more content waits, so a tab strip or a calendar
 * cut at the screen edge reads as "scroll me" instead of as broken. The scrollbar is hidden on
 * these strips (no-scrollbar), so without the fade nothing said there was more.
 */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > 2;
    const right = max - el.scrollLeft > 2;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [update]);

  const mask =
    edges.left || edges.right
      ? `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${
          edges.left ? FADE_PX : 0
        }px, #000 calc(100% - ${edges.right ? FADE_PX : 0}px), ${edges.right ? 'transparent' : '#000'} 100%)`
      : undefined;
  const style: CSSProperties | undefined = mask
    ? { maskImage: mask, WebkitMaskImage: mask }
    : undefined;

  return { ref, style, edges, update };
}
