/** "Hiệu lực đến" for the patrol result: ISO days are reformatted and counted, anything else is kept verbatim. */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;
const vnToday = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** Day number (days since epoch) of an ISO `YYYY-MM-DD…` string, or null when it is not one. */
function isoDayNumber(value: string | null | undefined): number | null {
  const m = value ? ISO_DAY.exec(value) : null;
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

export type PermitValidity = {
  /** dd/mm/yyyy when the server sent an ISO day; otherwise the server's string as is. */
  label: string;
  /** Whole days from today (Asia/Ho_Chi_Minh) to the end day; null when the end is not ISO. */
  daysLeft: number | null;
  /** Share of the validity period already used, 0–1; null without both ISO ends. */
  used: number | null;
};

/**
 * Reads "valid until" for the facts row. Only ISO days are reformatted and
 * counted; anything else is shown exactly as the server sent it.
 */
export function permitValidity(
  startDate: string | null | undefined,
  endDate: string,
  now: Date = new Date(),
): PermitValidity {
  const end = isoDayNumber(endDate);
  if (end == null) return { label: endDate, daysLeft: null, used: null };
  const today = isoDayNumber(vnToday.format(now))!;
  const [y, m, d] = endDate.slice(0, 10).split('-');
  const start = isoDayNumber(startDate);
  const used =
    start != null && end > start ? Math.min(1, Math.max(0, (today - start) / (end - start))) : null;
  return { label: `${d}/${m}/${y}`, daysLeft: end - today, used };
}
