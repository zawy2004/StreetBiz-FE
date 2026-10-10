import { useId, type ReactNode } from 'react';

import { formatVnd, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { dayShare, minutesOf } from './schedule-format';

const LABEL_GAP = 0.2; // closer than this (share of the day) and the two hour labels merge into one

function hhmmOf(time: string | null): string {
  return time ? time.slice(0, 5) : '';
}

type Segment = { left: number; width: number };

function segmentsOf(from: number | null, to: number | null): Segment[] | 'all' {
  if (from == null && to == null) return 'all';
  // Half-entered or equal hours are invalid (the form says so); paint nothing yet.
  if (from == null || to == null || from === to) return [];
  if (from < to) return [{ left: dayShare(from), width: dayShare(to - from) }];
  // Overnight: from the start hour to midnight, then from midnight to the end hour.
  return [
    { left: dayShare(from), width: 1 - dayShare(from) },
    { left: 0, width: dayShare(to) },
  ];
}

function labelStyle(at: number) {
  const pct = `${at * 100}%`;
  if (at < 0.08) return { left: pct, transform: 'translateX(0)' };
  if (at > 0.92) return { left: pct, transform: 'translateX(-100%)' };
  return { left: pct, transform: 'translateX(-50%)' };
}

/**
 * The trading window as a 24-hour strip: 24 hairline ticks, the open hours
 * painted brand orange with their times underneath. An overnight window paints
 * two pieces (start to midnight, midnight to end); no window paints the whole
 * day at 30%. Decoration for sighted readers: the hours are also in words.
 */
export function HourBand24({ from, to }: { from: string | null; to: string | null }) {
  const start = minutesOf(from);
  const end = minutesOf(to);
  const segments = segmentsOf(start, end);
  const labels: { at: number; text: string }[] = [];
  if (start != null && end != null && start !== end) {
    const a = dayShare(start);
    const b = dayShare(end);
    if (Math.abs(a - b) < LABEL_GAP) {
      labels.push({ at: (a + b) / 2, text: `${hhmmOf(from)} – ${hhmmOf(to)}` });
    } else {
      labels.push({ at: a, text: hhmmOf(from) }, { at: b, text: hhmmOf(to) });
    }
  }

  return (
    <div aria-hidden="true" className="flex items-start gap-1.5">
      <span className="w-5 pt-px text-right font-sign text-[11px] font-semibold leading-[10px] text-muted">
        0h
      </span>
      <div className="relative min-w-0 flex-1 pb-[18px]">
        <div
          className="relative h-[10px] overflow-hidden rounded-full bg-sunken ring-1 ring-inset ring-border"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0 calc(100% / 24 - 1px), rgb(var(--c-border)) calc(100% / 24 - 1px) calc(100% / 24))',
          }}
        >
          {segments === 'all' ? (
            <span className="absolute inset-0 bg-brand/30" />
          ) : (
            segments.map((s, i) => (
              <span
                key={i}
                className="absolute inset-y-0 bg-brand motion-safe:transition-[left,width] motion-safe:duration-200 motion-safe:[transition-timing-function:var(--ease-out)]"
                style={{ left: `${s.left * 100}%`, width: `${s.width * 100}%` }}
              />
            ))
          )}
        </div>
        {segments === 'all' ? (
          <span className="absolute left-1/2 top-[13px] -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold leading-none text-muted">
            Cả ngày
          </span>
        ) : (
          labels.map((l) => (
            <span
              key={l.text}
              className="absolute top-[13px] whitespace-nowrap font-sign text-[12px] font-bold leading-none text-text font-tabular motion-safe:transition-[left] motion-safe:duration-200"
              style={labelStyle(l.at)}
            >
              {l.text}
            </span>
          ))
        )}
      </div>
      <span className="w-6 pt-px font-sign text-[11px] font-semibold leading-[10px] text-muted">
        24h
      </span>
    </div>
  );
}

/** Let slots vs all slots, 6px: ink for the let part, sunken for the rest. */
export function OccupancyBar({ active, total }: { active: number; total: number }) {
  const share = total > 0 ? Math.min(1, active / total) : 0;
  return (
    <div className="flex items-center gap-sm">
      <div
        aria-hidden="true"
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-text" style={{ width: `${share * 100}%` }} />
      </div>
      <span className="shrink-0 text-body-sm font-medium text-text font-tabular">
        {active}/{total} ô đang cho thuê
      </span>
    </div>
  );
}

/** A small read-only tag on a sign (event dates, deadline, surcharges, monthly price). */
export function SignTag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'mango' | 'warm';
}) {
  const toneClass = {
    neutral: 'bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]',
    mango: 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]',
    warm: 'bg-[#FFF3E8] text-[#8A3206] dark:bg-[#2A2420] dark:text-[#FFB98F]',
  }[tone];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-[6px] px-2 text-body-xs font-semibold font-tabular ${toneClass}`}
    >
      {children}
    </span>
  );
}

type SignProps = {
  name: string;
  code: string | null;
  price: number | null;
  unit?: 'ngày' | 'tháng';
  from: string | null;
  to: string | null;
  overnight: boolean;
  /** Chips beside the code plate (overnight, event, deadline…). */
  tags?: ReactNode;
  occupancy?: { active: number; total: number };
  /** Omit to hide the permitting-document line; null means "none yet". */
  regulationRef?: string | null;
  /** List sign: a button that opens the editor. Without it the sign is a static preview. */
  onPress?: () => void;
  selected?: boolean;
};

/**
 * One pricing zone set like a posted street tariff sign: the painted kerb along
 * the top, the zone code on a small plate, the name, the price in large signage
 * figures, the 24-hour strip, then how full it is and the document that allows it.
 */
export function ZoneTariffSign({
  name,
  code,
  price,
  unit = 'ngày',
  from,
  to,
  overnight,
  tags,
  occupancy,
  regulationRef,
  onPress,
  selected,
}: SignProps) {
  const detailsId = useId();
  const hours = from && to ? `${hhmmOf(from)} đến ${hhmmOf(to)}` : 'Không giới hạn giờ';
  const priceWords = price ? `${price.toLocaleString('vi-VN')} đồng mỗi ${unit}` : 'chưa có giá';

  const body = (
    <>
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin rounded-t-[20px]" />
      <div className="flex flex-1 flex-col gap-sm p-md">
        <div id={detailsId} className="flex min-h-6 flex-wrap items-center gap-1.5">
          {code ? <span className="kerb-tag">{code}</span> : null}
          {tags}
        </div>
        <p className="line-clamp-2 break-words text-[18px] font-[650] leading-[1.3] tracking-[-0.01em] text-text">
          {name || 'Khu vực chưa đặt tên'}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-1">
          <span className="font-sign text-[36px] font-extrabold leading-none tracking-[-0.015em] text-primary font-tabular [font-stretch:86%]">
            {price ? formatVnd(price) : '— đ'}
          </span>
          <span className="text-[14px] font-medium text-muted">/{unit}</span>
        </p>
        <HourBand24 from={from} to={to} />
        {occupancy || regulationRef !== undefined ? (
          <div id={`${detailsId}-meta`} className="mt-auto flex flex-col gap-xs">
            {occupancy ? <OccupancyBar active={occupancy.active} total={occupancy.total} /> : null}
            {regulationRef !== undefined ? (
              regulationRef ? (
                <p className="truncate text-body-sm text-muted" title={regulationRef}>
                  Văn bản cho phép: <span className="font-medium text-text">{regulationRef}</span>
                </p>
              ) : (
                <p className="flex w-fit items-center gap-1 rounded-[6px] bg-[#FDEBEA] px-2 py-0.5 text-body-sm font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
                  <Icon name="alert-circle-outline" size={15} color="currentColor" />
                  Văn bản cho phép: chưa có
                </p>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  const shell =
    'relative flex h-full w-full flex-col rounded-[20px] bg-card text-left shadow-card transition-[box-shadow,transform] duration-200 [transition-timing-function:var(--ease-out)]';

  if (!onPress) {
    return (
      <div
        className={`${shell} ring-1 ring-border`}
        aria-label={`Xem trước biển giá: ${name || 'khu vực mới'}, ${priceWords}, ${hours}`}
        role="img"
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      aria-label={`${name}, ${priceWords}, ${hours}${overnight ? ' (qua đêm)' : ''}`}
      aria-describedby={
        occupancy || regulationRef !== undefined ? `${detailsId} ${detailsId}-meta` : detailsId
      }
      className={[
        shell,
        selected
          ? '-translate-y-0.5 shadow-card-hover ring-2 ring-primary'
          : 'ring-1 ring-border hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-text/25',
      ].join(' ')}
    >
      {body}
    </button>
  );
}

/** The sign's outline while zones load, so nothing jumps when they land. */
export function SignSkeleton() {
  return (
    <div className="flex h-[252px] flex-col rounded-[20px] bg-card shadow-card ring-1 ring-border">
      <div aria-hidden="true" className="h-1.5 rounded-t-[20px] bg-sunken" />
      <div className="flex flex-1 flex-col gap-sm p-md">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-2.5 w-full" />
        <div className="mt-auto flex flex-col gap-xs">
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

/** No zones yet: a blank tariff sign on its post, planted on the painted kerb. */
export function EmptySignArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 150" className="h-[150px] w-[220px]">
      <rect x="0" y="118" width="220" height="32" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={i * 22}
          y="112"
          width="22"
          height="7"
          className={i % 2 ? 'fill-[#FFF8F2] dark:fill-[#3A332D]' : 'fill-brand'}
        />
      ))}
      <rect
        x="106"
        y="70"
        width="8"
        height="46"
        rx="2"
        className="fill-[#C9D1DA] dark:fill-[#3B4A58]"
      />
      <rect
        x="46"
        y="10"
        width="128"
        height="70"
        rx="12"
        strokeWidth="2.5"
        strokeDasharray="9 6"
        className="fill-card stroke-brand"
      />
      <rect
        x="58"
        y="22"
        width="38"
        height="12"
        rx="3"
        className="fill-[#13202E] dark:fill-[#0B1219]"
      />
      <rect x="58" y="42" width="72" height="7" rx="3.5" className="fill-sunken" />
      <text
        x="58"
        y="70"
        className="fill-primary font-sign"
        style={{ fontSize: 20, fontWeight: 800 }}
      >
        — đ/ngày
      </text>
      <circle cx="160" cy="24" r="5" className="fill-accent" />
    </svg>
  );
}
