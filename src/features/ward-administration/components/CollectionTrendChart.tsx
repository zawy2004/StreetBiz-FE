import { useState } from 'react';

import { formatVnd } from '@/components/common';
import type { MonthlyCollectionDto } from '@/core/api';
import { compactVnd, monthLabel, niceTicks } from './chart-scale';

// Fixed series order and tokens (index.css --c-series-*): identity, never status.
const SERIES = [
  { key: 'feeCollected', label: 'Phí thuê ô', color: 'rgb(var(--c-series-1))' },
  { key: 'penaltyCollected', label: 'Tiền phạt', color: 'rgb(var(--c-series-2))' },
] as const;

const PLOT_HEIGHT = 160;

/**
 * WARD-14: money collected month by month, fees and penalties stacked into one column per month
 * (part of a whole: what the ward took in). Thin columns from one baseline, a 2 px surface gap
 * between the two parts, hairline grid. Only the latest month's total is written on the chart;
 * every month's figures are in the tooltip (hover or keyboard focus) and in the table below it.
 */
export function CollectionTrendChart({
  months,
  refreshing = false,
}: {
  months: MonthlyCollectionDto[];
  refreshing?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = months.map((m) => m.feeCollected + m.penaltyCollected);
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks[ticks.length - 1] ?? 0;
  const scale = (value: number) => (top > 0 ? (value / top) * PLOT_HEIGHT : 0);
  const shown = active == null ? null : months[active];

  return (
    <figure className={`m-0 transition-opacity duration-200 ${refreshing ? 'opacity-60' : ''}`}>
      <div className="mb-md flex flex-wrap gap-md" aria-hidden="true">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-2xs text-body-sm text-muted">
            <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>

      <div className="relative flex gap-2xs pt-xs">
        {/* Y axis: clean ticks in muted ink; the grid is a hairline one step off the surface. */}
        <div className="relative w-10 shrink-0" style={{ height: PLOT_HEIGHT }} aria-hidden="true">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 text-body-xs tabular-nums text-muted"
              style={{ bottom: scale(tick) }}
            >
              {compactVnd(tick)}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height: PLOT_HEIGHT }}>
          {ticks.map((tick) => (
            <span
              key={tick}
              aria-hidden="true"
              className="absolute inset-x-0 h-px bg-border"
              style={{ bottom: scale(tick) }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-around">
            {months.map((month, index) => {
              const fee = scale(month.feeCollected);
              const penalty = scale(month.penaltyCollected);
              const latest = index === months.length - 1;
              const total = totals[index] ?? 0;
              return (
                <button
                  key={`${month.year}-${month.month}`}
                  type="button"
                  aria-label={`${monthLabel(month.year, month.month)}: phí thuê ô ${formatVnd(month.feeCollected)}, tiền phạt ${formatVnd(month.penaltyCollected)}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  // The hit target is the whole column slot, not the painted pixels.
                  className="group relative flex h-full flex-1 flex-col items-center justify-end rounded-sm outline-offset-2"
                >
                  {latest && total > 0 ? (
                    <span className="mb-2xs text-body-xs font-semibold tabular-nums text-text">
                      {compactVnd(total)}
                    </span>
                  ) : null}
                  <span
                    className={`flex w-full max-w-[24px] flex-col justify-end transition-opacity duration-150 ${active != null && active !== index ? 'opacity-50' : ''}`}
                  >
                    {penalty > 0 ? (
                      <span
                        className="block rounded-t-[4px]"
                        style={{ height: Math.max(2, penalty), backgroundColor: SERIES[1].color }}
                      />
                    ) : null}
                    {penalty > 0 && fee > 0 ? <span className="block h-[2px] bg-card" /> : null}
                    {fee > 0 ? (
                      <span
                        className={`block ${penalty > 0 ? '' : 'rounded-t-[4px]'}`}
                        style={{ height: Math.max(2, fee), backgroundColor: SERIES[0].color }}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          {shown ? (
            <div
              role="status"
              className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-sm border border-border bg-card px-sm py-xs shadow-card-hover"
            >
              <p className="text-body-xs text-muted">Tháng {shown.month}/{shown.year}</p>
              {SERIES.map((series) => (
                <p key={series.key} className="flex items-center gap-xs text-body-sm">
                  <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: series.color }} />
                  <strong className="tabular-nums text-text">{formatVnd(shown[series.key])}</strong>
                  <span className="text-muted">{series.label}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="ml-12 mt-2xs flex justify-around" aria-hidden="true">
        {months.map((month) => (
          <span key={`${month.year}-${month.month}`} className="flex-1 text-center text-body-xs text-muted">
            {monthLabel(month.year, month.month)}
          </span>
        ))}
      </div>

      <details className="group mt-sm">
        <summary className="cursor-pointer list-none text-label text-primary">Xem bảng số liệu</summary>
        <table className="mt-xs w-full text-body-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2xs font-normal">Tháng</th>
              <th className="py-2xs text-right font-normal">Phí thuê ô</th>
              <th className="py-2xs text-right font-normal">Tiền phạt</th>
              <th className="py-2xs text-right font-normal">Phí đến hạn</th>
              <th className="py-2xs text-right font-normal">Nộp đúng hạn</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={`${month.year}-${month.month}`} className="border-t border-border text-text">
                <td className="py-2xs">{monthLabel(month.year, month.month)}</td>
                <td className="py-2xs text-right tabular-nums">{formatVnd(month.feeCollected)}</td>
                <td className="py-2xs text-right tabular-nums">{formatVnd(month.penaltyCollected)}</td>
                <td className="py-2xs text-right tabular-nums">{formatVnd(month.feeDue)}</td>
                <td className="py-2xs text-right tabular-nums">{formatVnd(month.feeDuePaidOnTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
