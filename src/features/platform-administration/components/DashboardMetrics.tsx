import { useState } from 'react';

import { Icon, Money, type IconName } from '@/components/common';
import { formatVnd } from '@/components/common/formatVnd';
import type { DashboardMetric, PlatformDashboard } from '../platform-api';

/** "▲ 12,5%" against the previous period. A rise can be bad (cancellations), hence `goodWhen`. */
export function DeltaChip({
  metric,
  goodWhen = 'up',
}: {
  metric: DashboardMetric;
  goodWhen?: 'up' | 'down';
}) {
  if (metric.changePercent === null) {
    return (
      <span className="text-body-xs text-muted">
        {metric.previous === 0 ? 'Kỳ trước chưa có số liệu' : 'Không đổi'}
      </span>
    );
  }
  const up = metric.changePercent > 0;
  const flat = metric.changePercent === 0;
  const good = flat ? null : up === (goodWhen === 'up');
  const text = `${up ? '+' : ''}${metric.changePercent.toLocaleString('vi-VN')}%`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-body-xs font-semibold font-tabular ${
        good === null ? 'text-muted' : good ? 'text-tertiary' : 'text-error'
      }`}
    >
      <Icon
        name={flat ? 'minus' : up ? 'arrow-up' : 'arrow-down'}
        size={13}
        color="currentColor"
      />
      {text}
      <span className="sr-only">so với kỳ trước</span>
      <span aria-hidden="true" className="font-normal text-muted">
        {' '}
        so với kỳ trước
      </span>
    </span>
  );
}

export function KpiCard({
  label,
  icon,
  metric,
  format,
  goodWhen,
}: {
  label: string;
  icon: IconName;
  metric: DashboardMetric;
  format: (value: number) => string;
  goodWhen?: 'up' | 'down';
}) {
  return (
    <section
      aria-label={label}
      className="flex flex-col gap-xs rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80"
    >
      <span className="flex items-center gap-xs text-label text-muted">
        <Icon name={icon} size={18} color="currentColor" />
        {label}
      </span>
      <span className="font-sign text-[30px] font-semibold leading-[36px] text-text font-tabular">
        {format(metric.value)}
      </span>
      <DeltaChip metric={metric} goodWhen={goodWhen} />
      <span className="text-body-xs text-muted font-tabular">
        Kỳ trước: {format(metric.previous)}
      </span>
    </section>
  );
}

type ChartMode = 'orders' | 'gmv';

const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const compactVnd = (value: number) =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`
    : value >= 1_000
      ? `${Math.round(value / 1_000).toLocaleString('vi-VN')} k`
      : String(value);

/**
 * Orders placed per day, or the value of the orders completed per day. A light inline SVG: one
 * bar per calendar day (so a quiet day is a visible gap), three y-axis ticks, and a text
 * alternative with the totals for people who cannot see the bars.
 */
export function OrdersChart({ days }: { days: PlatformDashboard['ordersByDay'] }) {
  const [mode, setMode] = useState<ChartMode>('orders');
  const values = days.map((d) => (mode === 'orders' ? d.ordersPlaced : d.gmv));
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, v) => sum + v, 0);
  const width = 640;
  const height = 180;
  const left = 44;
  const bottom = 22;
  const plotW = width - left;
  const plotH = height - bottom - 8;
  const slot = plotW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(24, slot * 0.7));
  const tick = (value: number) => (mode === 'orders' ? String(Math.round(value)) : compactVnd(value));
  const labelEvery = Math.max(1, Math.ceil(days.length / 8));

  return (
    <section
      aria-label="Đơn hàng theo ngày"
      className="rounded-[24px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="font-sign text-[18px] font-bold text-text">Theo ngày</h2>
        <div role="tablist" className="flex gap-1 rounded-[10px] border border-border p-0.5">
          {(
            [
              ['orders', 'Số đơn'],
              ['gmv', 'Giá trị đơn hoàn tất'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`h-8 rounded-[8px] px-sm text-label ${mode === value ? 'bg-primary font-semibold text-on-primary' : 'text-muted hover:bg-sunken'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {days.length === 0 || total === 0 ? (
        <p className="mt-md rounded-[14px] bg-sunken/70 px-sm py-md text-body-md text-muted">
          Chưa có đơn nào trong kỳ này.
        </p>
      ) : (
        <svg
          role="img"
          aria-label={
            mode === 'orders'
              ? `Tổng ${total} đơn trong ${days.length} ngày`
              : `Tổng giá trị đơn hoàn tất ${formatVnd(total)} trong ${days.length} ngày`
          }
          viewBox={`0 0 ${width} ${height}`}
          className="mt-sm h-auto w-full"
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = 8 + plotH - plotH * fraction;
            return (
              <g key={fraction}>
                <line x1={left} x2={width} y1={y} y2={y} className="stroke-border" strokeWidth={1} />
                <text x={left - 6} y={y + 4} textAnchor="end" className="fill-muted text-[10px]">
                  {tick(max * fraction)}
                </text>
              </g>
            );
          })}
          {days.map((day, i) => {
            const value = values[i]!;
            const h = (value / max) * plotH;
            const x = left + slot * i + (slot - barW) / 2;
            return (
              <g key={day.day}>
                <rect
                  x={x}
                  y={8 + plotH - h}
                  width={barW}
                  height={Math.max(h, value > 0 ? 1 : 0)}
                  rx={2}
                  className="fill-brand"
                >
                  <title>
                    {shortDay(day.day)}: {mode === 'orders' ? `${value} đơn` : formatVnd(value)}
                  </title>
                </rect>
                {i % labelEvery === 0 ? (
                  <text
                    x={x + barW / 2}
                    y={height - 6}
                    textAnchor="middle"
                    className="fill-muted text-[10px]"
                  >
                    {shortDay(day.day)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      )}
    </section>
  );
}

export function TopStorefrontsTable({ rows }: { rows: PlatformDashboard['topStorefronts'] }) {
  return (
    <section
      aria-label="Gian hàng doanh thu cao nhất"
      className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border/80"
    >
      <h2 className="px-md pb-xs pt-md font-sign text-[18px] font-bold text-text md:px-lg">
        Top 5 gian hàng theo doanh thu
      </h2>
      {rows.length === 0 ? (
        <p className="px-md pb-md text-body-md text-muted md:px-lg">
          Chưa có đơn hoàn tất nào trong kỳ này.
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {rows.map((row, i) => (
            <li key={row.storefrontId} className="flex items-center gap-sm px-md py-sm md:px-lg">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken font-sign text-body-sm font-semibold text-text"
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-md font-semibold text-text">
                  {row.storefrontName}
                </span>
                <span className="block text-body-xs text-muted">
                  {row.completedOrders} đơn hoàn tất
                </span>
              </span>
              <Money amountVnd={row.revenue} className="font-sign font-semibold" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
