import { useEffect, useState } from 'react';

/** Pixels of travel that count as a deliberate scroll, so a jitter does not flicker the launcher. */
const THRESHOLD = 8;
/** Near the top or the end of a scroller the launcher always shows. */
const EDGE = 80;

/**
 * True while the user is scrolling content down. The floating launcher steps aside then, so it
 * never sits on a row the user is reading or a control they are about to tap, and comes back
 * on the first scroll up, at the top and at the end of the page (where Screen's bottom padding
 * keeps the last row clear of it). Listens in the capture phase because each screen scrolls its
 * own container, not the window. `resetKey` (the route) brings it back on navigation.
 */
export function useScrollAway(resetKey: unknown): boolean {
  const [away, setAway] = useState(false);

  useEffect(() => {
    setAway(false);
    const last = new WeakMap<EventTarget, number>();
    const onScroll = (event: Event) => {
      const el =
        event.target instanceof Element
          ? event.target
          : (document.scrollingElement ?? document.documentElement);
      const top = el.scrollTop;
      const previous = last.get(el) ?? top;
      last.set(el, top);
      const nearEnd = el.scrollHeight - el.clientHeight - top < EDGE;
      if (top < EDGE || nearEnd) {
        setAway(false);
      } else if (top - previous > THRESHOLD) {
        setAway(true);
      } else if (previous - top > THRESHOLD) {
        setAway(false);
      }
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [resetKey]);

  return away;
}
