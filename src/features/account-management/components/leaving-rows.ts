import { useEffect, useState } from 'react';

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Keeps a row on screen for a moment after the server stops listing it, so it
 * can fold away instead of vanishing. Display only: the row is already gone
 * from the data, and nothing here reads or writes it.
 *
 * The removed rows are worked out while rendering (React's "adjust state when
 * props change" pattern), so the row's element is never unmounted first and
 * its collapse transition can run.
 */
export function useLeavingRows<T>(
  items: T[],
  keyOf: (item: T) => number,
): { item: T; leaving: boolean }[] {
  const signature = items.map(keyOf).join('|');
  const [seen, setSeen] = useState({ signature, items });
  const [gone, setGone] = useState<{ item: T; index: number }[]>([]);

  if (signature !== seen.signature) {
    const present = new Set(items.map(keyOf));
    const removed = seen.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !present.has(keyOf(item)));
    setSeen({ signature, items });
    if (removed.length && !reducedMotion()) setGone((current) => [...current, ...removed]);
  }

  useEffect(() => {
    if (!gone.length) return;
    const timer = setTimeout(() => setGone([]), 220);
    return () => clearTimeout(timer);
  }, [gone]);

  const rows = items.map((item) => ({ item, leaving: false }));
  for (const { item, index } of gone) {
    if (!rows.some((row) => keyOf(row.item) === keyOf(item)))
      rows.splice(Math.min(index, rows.length), 0, { item, leaving: true });
  }
  return rows;
}
