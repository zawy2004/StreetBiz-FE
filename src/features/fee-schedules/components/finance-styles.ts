import { useEffect, useState, type CSSProperties } from 'react';

/** Style constants and the entrance flag shared by the vendor finance screens. */

/**
 * False on the first frame, true from the next one: lets a CSS transition run
 * from its start state (a bar growing, a margin being ruled). Transitions are
 * switched off globally under `prefers-reduced-motion`, so the end state shows at once.
 */
export function useEntered(ready = true) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [ready]);
  return entered;
}

export const EASE_OUT: CSSProperties = { transitionTimingFunction: 'var(--ease-out)' };

/** `--delay` for the shared `sb-rise` entrance. */
export const riseDelay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

/** Ink and wash pairs at 7:1 or more, for words that must read outdoors. */
export const INK = {
  danger: 'text-[#8F1717] dark:text-[#FF9A90]',
  pending: 'text-[#6B4100] dark:text-[#FFD27A]',
  ok: 'text-[#0B5D33] dark:text-[#8BE3B0]',
  neutral: 'text-[#2B3640] dark:text-[#C5D0DA]',
} as const;

/** Edge rule of a card by status: red to pay, green paid, grey closed. */
export const RULE = {
  danger: 'bg-[#B42318] dark:bg-[#FF7A6E]',
  pending: 'bg-accent',
  ok: 'bg-[#0B7F43] dark:bg-[#4ED18A]',
  neutral: 'bg-[#9AA5B1] dark:bg-[#5B6875]',
  none: 'bg-border',
} as const;

/**
 * Paper edges cut with CSS masks. A mask also clips box-shadow, so wrap the
 * paper in an element carrying `PAPER_SHADOW` (a drop-shadow filter follows the teeth).
 */
export const PAPER_SHADOW: CSSProperties = {
  filter:
    'drop-shadow(0 18px 28px rgb(17 28 43 / 0.12)) drop-shadow(0 1px 1px rgb(17 28 43 / 0.08))',
};

const TEETH_BOTTOM =
  'conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% 100% / 14px 51% repeat-x';
const TEETH_TOP =
  'conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 50% 0 / 14px 51% repeat-x';
const SOLID_TOP = 'linear-gradient(#000 0 0) 0 0 / 100% 51% no-repeat';

/** Torn-off-ticket edge along the bottom only. */
export const TEETH_BOTTOM_MASK: CSSProperties = {
  WebkitMask: `${SOLID_TOP}, ${TEETH_BOTTOM}`,
  mask: `${SOLID_TOP}, ${TEETH_BOTTOM}`,
};

/** Receipt teeth at both ends. */
export const TEETH_BOTH_MASK: CSSProperties = {
  WebkitMask: `${TEETH_TOP}, ${TEETH_BOTTOM}`,
  mask: `${TEETH_TOP}, ${TEETH_BOTTOM}`,
};
