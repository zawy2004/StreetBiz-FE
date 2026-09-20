import type { ReactNode } from 'react';

type Row = { label: string; value: ReactNode };

/** Label on the left, value on the right, in a soft box inside a card. Rows without a value are left out. */
export function InfoRows({ rows }: { rows: Row[] }) {
  const shown = rows.filter((row) => row.value != null && row.value !== '');
  if (shown.length === 0) return null;
  return (
    <dl className="flex flex-col gap-1 rounded-sm bg-bg p-sm text-body-sm">
      {shown.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-sm">
          <dt className="text-muted">{row.label}</dt>
          <dd className="text-right font-semibold text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
