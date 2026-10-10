import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { formatVnd, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import type { SalesBucket, SalesGroup } from '@/features/orders/types/order.types';
import { playOnce } from '@/features/food-safety/components/motion';
import { bucketLabel, shortKey } from '../../sales-view';

const GROUP_WORD: Record<SalesGroup, string> = { day: 'ngày', week: 'tuần', month: 'tháng' };

/** Width of the element, following resizes (a fixed guess where it cannot be measured). */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (node.clientWidth) setWidth(node.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Takings per period as a row of columns, drawn in SVG from the buckets the
 * screen loaded: the best one in vivid orange with a pin, refunds stacked on
 * top in pale red, empty days as a hairline. Arrow keys walk the columns and
 * the label below reads the one in focus.
 */
export function SalesBarChart({
  buckets,
  groupBy,
  best,
  height,
  describedBy,
}: {
  buckets: SalesBucket[];
  groupBy: SalesGroup;
  best: SalesBucket | undefined;
  height: number;
  describedBy?: string;
}) {
  const [frame, width] = useWidth<HTMLDivElement>(640);
  const [active, setActive] = useState<number | null>(null);
  const bars = useRef<SVGGElement>(null);
  const liveId = useId();
  const top = 28;
  const max = Math.max(1, ...buckets.map((b) => b.netSales + b.refundedAmount));
  const slot = buckets.length ? width / buckets.length : width;
  const few = buckets.length <= 2;
  const barWidth = Math.max(2, Math.min(few ? 64 : 44, slot * (buckets.length > 60 ? 0.8 : 0.66)));
  const xOf = (index: number) =>
    few ? index * (barWidth + 16) : index * slot + (slot - barWidth) / 2;
  const scale = (value: number) => (value / max) * (height - top);
  const dataKey = buckets.map((b) => `${b.key}:${b.netSales}`).join('|');

  // Columns grow from the baseline each time new numbers arrive.
  useEffect(() => {
    bars.current?.querySelectorAll('[data-bar]').forEach((bar, index) =>
      playOnce(bar, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
        duration: 420,
        delay: Math.min(index * 12, 280),
      }),
    );
  }, [dataKey]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!buckets.length) return;
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (event.key === 'Escape') setActive(null);
    if (!step) return;
    event.preventDefault();
    setActive((current) =>
      current === null
        ? step > 0
          ? 0
          : buckets.length - 1
        : (current + step + buckets.length) % buckets.length,
    );
  };

  const shown = active !== null ? buckets[active] : undefined;
  const tip = shown
    ? `${bucketLabel(shown.key)} · ${formatVnd(shown.netSales)} · ${shown.completedOrderCount} đơn`
    : '';
  const ticks =
    buckets.length <= 2
      ? buckets.map((_, i) => i)
      : [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1];
  const bestIndex = best ? buckets.findIndex((b) => b.key === best.key) : -1;
  const label = best
    ? `Biểu đồ thực thu theo ${GROUP_WORD[groupBy]}, cao nhất ${bucketLabel(best.key)} ${formatVnd(best.netSales)}`
    : `Biểu đồ thực thu theo ${GROUP_WORD[groupBy]}`;

  return (
    <div className="flex flex-col gap-xs">
      <div
        ref={frame}
        role="img"
        aria-label={label}
        aria-describedby={describedBy}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
        className="relative w-full rounded-[12px] outline-offset-4"
        style={{ height }}
      >
        <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
          <line
            x1="0"
            x2={width}
            y1={height - 0.5}
            y2={height - 0.5}
            className="stroke-border"
            strokeWidth="1"
          />
          <g ref={bars}>
            {buckets.map((bucket, index) => {
              const x = xOf(index);
              const net = scale(bucket.netSales);
              const refund = scale(bucket.refundedAmount);
              const isBest = index === bestIndex;
              const lit = active === index;
              if (bucket.netSales <= 0 && bucket.refundedAmount <= 0)
                return (
                  <rect
                    key={bucket.key}
                    x={x}
                    y={height - 2}
                    width={barWidth}
                    height={2}
                    rx={1}
                    className="fill-border"
                    onMouseEnter={() => setActive(index)}
                  />
                );
              const radius = Math.min(4, barWidth / 2);
              return (
                <g
                  key={bucket.key}
                  data-bar
                  style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => setActive((current) => (current === index ? null : index))}
                >
                  {/* Hit area the full height of the column, so thin bars are easy to touch. */}
                  <rect
                    x={index * slot}
                    y={0}
                    width={Math.max(slot, barWidth)}
                    height={height}
                    fill="transparent"
                  />
                  {refund > 0 ? (
                    <rect
                      x={x + 0.5}
                      y={height - net - refund}
                      width={barWidth - 1}
                      height={refund}
                      rx={Math.min(radius, refund / 2)}
                      style={{ fill: '#FDEBEA', stroke: 'rgb(var(--c-error))', strokeWidth: 1 }}
                    />
                  ) : null}
                  {net > 0 ? (
                    <path
                      d={`M${x},${height} V${height - net + radius} Q${x},${height - net} ${x + radius},${height - net} H${x + barWidth - radius} Q${x + barWidth},${height - net} ${x + barWidth},${height - net + radius} V${height} Z`}
                      style={{
                        fill: isBest ? 'rgb(var(--c-brand))' : 'rgb(var(--c-primary))',
                        opacity: isBest || lit ? 1 : 0.7,
                      }}
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
        {bestIndex >= 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full bg-card px-1.5 py-0.5 text-[11px] font-bold text-primary shadow-card ring-1 ring-brand/30"
            style={{
              left: Math.min(Math.max(xOf(bestIndex) + barWidth / 2, 40), width - 40),
              top: Math.max(0, height - scale(best!.netSales + best!.refundedAmount) - 26),
            }}
          >
            <Icon name="star" size={11} color="currentColor" />
            Cao nhất
          </span>
        ) : null}
        {shown ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-card px-sm py-1 text-body-sm font-semibold text-text shadow-sheet ring-1 ring-border"
            style={{ left: Math.min(Math.max(xOf(active!) + barWidth / 2, 110), width - 110) }}
          >
            {tip}
          </span>
        ) : null}
      </div>
      <div className="relative h-5 text-body-xs tabular-nums text-muted" aria-hidden="true">
        {ticks.map((index, order) => {
          const bucket = buckets[index];
          if (!bucket) return null;
          const center = xOf(index) + barWidth / 2;
          const align =
            !few && order === 0
              ? { left: 0 }
              : !few && order === ticks.length - 1
                ? { right: 0 }
                : { left: center, transform: 'translateX(-50%)' };
          return (
            <span
              key={bucket.key}
              className={`absolute top-0 whitespace-nowrap ${order === 1 && !few ? 'hidden sm:inline' : ''}`}
              style={align}
            >
              {shortKey(bucket.key)}
            </span>
          );
        })}
      </div>
      <p id={liveId} aria-live="polite" className="sr-only">
        {tip}
      </p>
    </div>
  );
}

/** No completed order in the range: a row of empty pavement slots where the columns would stand. */
export function EmptyChart({ height }: { height: number }) {
  return (
    <div aria-hidden="true" className="flex items-end gap-1.5 overflow-hidden" style={{ height }}>
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-[6px] border-2 border-b-0 border-dashed border-brand/30 bg-brand/[0.04]"
          style={{ height: `${28 + ((i * 37) % 50)}%` }}
        />
      ))}
    </div>
  );
}

/** One of the three side figures, with a coloured rule on its left. */
export function SalesStatTile({
  label,
  value,
  rule,
  labelClass = 'text-muted',
  note,
  className = '',
}: {
  label: string;
  value: string;
  rule: string;
  labelClass?: string;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-[20px] bg-card py-md pl-lg pr-md shadow-card ring-1 ring-border ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-md left-0 w-1 rounded-r-full ${rule}`}
      />
      <p className={`text-body-md ${labelClass}`}>{label}</p>
      <p className="break-words font-sign text-[24px] font-bold leading-tight tabular-nums text-text md:text-[26px] xl:text-[30px]">
        {value}
      </p>
      {note}
    </div>
  );
}

/** First load: the board with grey columns, the three figures and four rows. */
export function SalesSkeleton() {
  const heights = [32, 48, 20, 64, 40, 72, 28, 56, 36, 80, 44, 24, 60, 38, 52, 30, 68, 42, 26, 58];
  return (
    <div aria-busy="true" className="flex flex-col gap-md">
      <span className="sr-only">Đang tải…</span>
      <div className="overflow-hidden rounded-[28px] bg-card ring-1 ring-border">
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
        <div className="flex flex-col gap-md p-md md:p-lg">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-64 md:h-16" />
          <div className="flex h-[140px] items-end gap-1.5 md:h-[200px]">
            {heights.map((height, i) => (
              <div key={i} className="w-full" style={{ height: `${height}%` }}>
                <Skeleton className="h-full w-full rounded-b-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton
            key={key}
            className={`h-[104px] rounded-[20px] ${key === 2 ? 'col-span-2 md:col-span-1' : ''}`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-xs rounded-[20px] bg-card p-md ring-1 ring-border">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
