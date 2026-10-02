/**
 * Page numbers with first, last and the current page's neighbours, gaps as
 * "…": 1 … 4 5 6 … 12. Seven slots at most, so it never wraps on a phone.
 */
export function pageSlots(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  let start = Math.max(2, Math.min(page - 1, totalPages - 4));
  let end = Math.min(totalPages - 1, Math.max(page + 1, 5));
  // A "…" standing for a single page hides a number that would fit: show it.
  if (start === 3) start = 2;
  if (end === totalPages - 2) end = totalPages - 1;
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return [
    1,
    ...(start > 2 ? (['gap'] as const) : []),
    ...middle,
    ...(end < totalPages - 1 ? (['gap'] as const) : []),
    totalPages,
  ];
}

/** "Đơn 11–20 trên 34": where this page sits in the whole list. */
export function rangeCaption(
  noun: string,
  page: number,
  pageSize: number,
  totalItems: number,
  shown: number,
): string {
  const first = (page - 1) * pageSize + 1;
  return `${noun} ${first}–${first + shown - 1} trên ${totalItems}`;
}
