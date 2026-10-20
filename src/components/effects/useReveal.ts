import { useEffect, useRef } from 'react';

/**
 * Fades `.sb-reveal` children of the returned ref in as they scroll into view.
 * Elements start visible if IntersectionObserver is missing (tests, old
 * browsers), so content is never stuck hidden.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = Array.from(root.querySelectorAll<HTMLElement>('.sb-reveal'));
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((item) => item.setAttribute('data-shown', ''));
      return undefined;
    }

    root.setAttribute('data-reveal', '');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-shown', '');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return ref;
}
