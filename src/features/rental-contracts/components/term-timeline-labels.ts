/** "T12" in the 13px sign face is about 24px wide; keep a gap so two labels never touch. */
export const MIN_LABEL_GAP_PX = 34;

/**
 * Which month labels of the contract timeline fit, as indexes into `positions` (each a
 * fraction 0..1 of the track). Walks left to right and keeps a label only when it is far enough
 * from the last one kept, then makes room for the last month, which marks where the latest
 * contract ends. On a phone two neighbouring months used to be labelled together ("T11T12").
 */
export function visibleMonthLabels(positions: readonly number[], widthPx: number): Set<number> {
  const gap = (from: number, to: number) => (positions[to]! - positions[from]!) * widthPx;
  const keep: number[] = [];
  positions.forEach((_, i) => {
    const previous = keep.at(-1);
    if (previous === undefined || gap(previous, i) >= MIN_LABEL_GAP_PX) keep.push(i);
  });
  const last = positions.length - 1;
  if (last > 0 && keep.at(-1) !== last) {
    while (keep.length > 1 && gap(keep.at(-1)!, last) < MIN_LABEL_GAP_PX) keep.pop();
    if (gap(keep.at(-1)!, last) >= MIN_LABEL_GAP_PX) keep.push(last);
  }
  return new Set(keep);
}
