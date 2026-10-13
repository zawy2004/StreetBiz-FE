import type { CSSProperties, ReactNode } from 'react';

import { Skeleton } from '@/components/feedback';
import { compactVnd, type LogScale } from './schedule-format';
import { useArrived } from './schedule-motion';

const RING = 30; // radius in the 72px ring
const CIRCUMFERENCE = 2 * Math.PI * RING;

/**
 * How many active violation types have a legal basis: green for covered, red for
 * missing, "5/13" in the middle (real text, read out with the ring's label). The
 * arcs run out to their share once the data is in.
 */
export function CoverageRing({ covered, total }: { covered: number; total: number }) {
  const arrived = useArrived();
  const okLen = total > 0 ? (covered / total) * CIRCUMFERENCE : 0;
  const missLen = total > 0 ? CIRCUMFERENCE - okLen : 0;
  const arc =
    'motion-safe:transition-[stroke-dasharray,stroke-dashoffset] motion-safe:duration-[800ms] motion-safe:[transition-timing-function:var(--ease-out)]';

  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg aria-hidden="true" viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={RING} fill="none" strokeWidth="8" className="stroke-sunken" />
        {okLen > 0 && (
          <circle
            cx="36"
            cy="36"
            r={RING}
            fill="none"
            strokeWidth="8"
            strokeLinecap="butt"
            className={`stroke-[#0B7F43] dark:stroke-[#4ED18A] ${arc}`}
            strokeDasharray={`${arrived ? okLen : 0} ${CIRCUMFERENCE}`}
          />
        )}
        {missLen > 0 && (
          <circle
            cx="36"
            cy="36"
            r={RING}
            fill="none"
            strokeWidth="8"
            className={`stroke-[#B42318] dark:stroke-[#FF7A6E] ${arc}`}
            strokeDasharray={`${arrived ? missLen : 0} ${CIRCUMFERENCE}`}
            strokeDashoffset={arrived ? -okLen : 0}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-sign text-[22px] font-extrabold leading-none text-text font-tabular [font-stretch:85%]">
        {covered}/{total}
      </span>
    </div>
  );
}

export type PenaltyFilter = 'all' | 'missing' | 'scheduled' | 'none';

const FILTERS: { value: PenaltyFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'missing', label: 'Thiếu căn cứ' },
  { value: 'scheduled', label: 'Có mức hẹn' },
  { value: 'none', label: 'Chưa có mức' },
];

/** Client-side chips over the already-loaded list; nothing is fetched or remembered. */
export function PenaltyFilterBar({
  value,
  counts,
  onChange,
}: {
  value: PenaltyFilter;
  counts: Record<PenaltyFilter, number>;
  onChange: (value: PenaltyFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Lọc hành vi"
      className="no-scrollbar -mx-md flex gap-xs overflow-x-auto px-md py-1 md:mx-0 md:flex-wrap md:px-0"
    >
      {FILTERS.map((f) => {
        const on = f.value === value;
        const warn = f.value === 'missing' && counts.missing > 0;
        return (
          <button
            key={f.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(f.value)}
            className={[
              'flex h-12 shrink-0 items-center gap-xs rounded-full px-md text-body-md font-semibold transition-colors duration-150',
              on
                ? 'bg-primary text-on-primary shadow-[0_8px_18px_-10px_rgb(var(--c-primary)/0.9)]'
                : 'bg-card text-text ring-1 ring-inset ring-border hover:bg-sunken',
            ].join(' ')}
          >
            {f.label}
            <span
              className={[
                'min-w-6 rounded-full px-1.5 py-0.5 text-center text-body-xs font-bold font-tabular',
                on
                  ? 'bg-white/25 text-on-primary'
                  : warn
                    ? 'bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]'
                    : 'bg-sunken text-muted',
              ].join(' ')}
            >
              {counts[f.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Tick labels of the shared scale ("200 nghìn", "1 tr", "5 tr", "20 tr"). */
export function RulerAxis({ scale, className }: { scale: LogScale; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-4 ${className ?? ''}`}>
      {scale.ticks.map((t) => {
        const at = scale.at(t);
        const shift = at < 0.06 ? '0' : at > 0.94 ? '-100%' : '-50%';
        return (
          <span
            key={t}
            className="absolute top-0 whitespace-nowrap text-[11px] font-semibold leading-4 text-muted font-tabular"
            style={{ left: `${at * 100}%`, transform: `translateX(${shift})` }}
          >
            {compactVnd(t)}
          </span>
        );
      })}
    </div>
  );
}

type Bracket = { min: number | null; max: number | null; amount: number };

function Segment({
  scale,
  bracket,
  dashed,
  top,
}: {
  scale: LogScale;
  bracket: Bracket;
  dashed?: boolean;
  top: number;
}) {
  if (bracket.min == null || bracket.max == null) return null;
  const left = scale.at(bracket.min);
  const width = Math.max(0.012, scale.at(bracket.max) - left);
  return (
    <span
      className={[
        'absolute h-2 rounded-full motion-safe:transition-[left,width] motion-safe:duration-[120ms]',
        dashed
          ? 'border-2 border-dashed border-brand bg-transparent'
          : 'bg-[#FFD9C2] ring-1 ring-brand dark:bg-[#5A2A12]',
      ].join(' ')}
      style={{ left: `${left * 100}%`, width: `${width * 100}%`, top }}
    />
  );
}

/**
 * A violation's fine bracket on the page-wide log scale: the bracket as a pale
 * orange bar, the applied amount (its midpoint) as a dot that slides in from the
 * left. A scheduled bracket is drawn dashed underneath; no bracket at all is an
 * empty dashed rule. The words are in the label; nothing here prints the full
 * amount, so the figure beside it stays the only one.
 */
export function BracketRuler({
  scale,
  current,
  next,
  label,
  order = 0,
  emptyText = 'Chưa có mức',
  quick,
}: {
  scale: LogScale;
  current: Bracket | null;
  next?: Bracket | null;
  label: string;
  /** Row index, for the staggered slide-in (capped at 10 rows). */
  order?: number;
  emptyText?: string;
  /** Live preview while typing: markers follow in 120ms, no stagger. */
  quick?: boolean;
}) {
  const arrived = useArrived();
  const delay = quick ? '0ms' : `${Math.min(order, 10) * 40}ms`;
  const markerMotion = quick ? 'motion-safe:duration-[120ms]' : 'motion-safe:duration-[600ms]';
  const tall = !!next;

  return (
    <div role="img" aria-label={label} className="min-w-0">
      <div className={`relative ${tall ? 'h-[40px]' : 'h-[28px]'}`}>
        <span aria-hidden="true" className="absolute inset-x-0 top-[13px] h-px bg-border" />
        {scale.ticks.map((t) => (
          <span
            key={t}
            aria-hidden="true"
            className="absolute top-[9px] h-[9px] w-px bg-border"
            style={{ left: `${scale.at(t) * 100}%` }}
          />
        ))}
        {current ? (
          <>
            <Segment scale={scale} bracket={current} top={10} />
            <span
              aria-hidden="true"
              className={`absolute top-[7px] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_0_3px_rgb(var(--c-card))] motion-safe:transition-[left] ${markerMotion} motion-safe:[transition-timing-function:var(--ease-out)]`}
              style={
                {
                  left: `${(arrived ? scale.at(current.amount) : 0) * 100}%`,
                  transitionDelay: delay,
                } as CSSProperties
              }
            />
          </>
        ) : !next ? (
          <span className="absolute inset-x-0 top-[3px] flex h-[22px] items-center justify-center rounded-full border-2 border-dashed border-border bg-card text-body-xs font-semibold text-muted">
            {emptyText}
          </span>
        ) : null}
        {next ? (
          <>
            <Segment scale={scale} bracket={next} dashed top={26} />
            <span
              aria-hidden="true"
              className={`absolute top-[23px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[3px] border-[#B57400] bg-card motion-safe:transition-[left] ${markerMotion}`}
              style={{
                left: `${(arrived ? scale.at(next.amount) : 0) * 100}%`,
                transitionDelay: delay,
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Current → scheduled: a solid green dot for the rate in force, a hollow mango
 * dot for the one waiting, joined by a rule.
 */
export function EffectiveTimeline({
  now,
  next,
  action,
}: {
  now: ReactNode;
  next: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-sm rounded-[16px] bg-[#FFF3D1]/45 p-sm md:flex-row md:items-center md:gap-md md:p-md dark:bg-[#3A2A08]/40">
      <ol className="flex min-w-0 flex-1 flex-col gap-sm md:flex-row md:items-start md:gap-0">
        <li className="flex min-w-0 items-start gap-xs md:flex-1">
          <span
            aria-hidden="true"
            className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-[#0B7F43] dark:bg-[#4ED18A]"
          />
          <div className="min-w-0">{now}</div>
        </li>
        <li
          aria-hidden="true"
          className="ml-[6px] h-4 w-0.5 bg-[#B57400]/40 md:mx-sm md:mt-[13px] md:h-0.5 md:w-10 md:shrink-0"
        />
        <li className="flex min-w-0 items-start gap-xs md:flex-1">
          <span
            aria-hidden="true"
            className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-[#B57400] bg-card"
          />
          <div className="min-w-0">{next}</div>
        </li>
      </ol>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Six rows and the ring, in the shape of the page, while the schedule loads. */
export function PenaltySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-md">
      <div className="flex items-center gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
        <div className="sb-shimmer h-[72px] w-[72px] rounded-full" />
        <div className="flex flex-1 flex-col gap-xs">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="flex gap-xs">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sb-shimmer h-12 w-28 rounded-full" />
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="grid h-[112px] gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border xl:grid-cols-[minmax(0,1fr)_320px_190px] xl:items-center"
        >
          <div className="flex flex-col gap-xs">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-6 w-1/2 xl:ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** Policy section still loading: the same height as the sentence card, so nothing jumps. */
export function PolicySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-sm">
      <Skeleton className="h-6 w-2/3" />
      <div className="sb-shimmer h-[200px] rounded-[20px]" />
    </div>
  );
}

/** Every active type lacks a legal basis: a blank regulation sheet, nothing to cite yet. */
export function BlankSheetArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 112"
      className="hidden h-[112px] w-[96px] shrink-0 md:block"
    >
      <rect
        x="8"
        y="6"
        width="74"
        height="98"
        rx="8"
        strokeWidth="2.5"
        strokeDasharray="7 5"
        className="fill-card stroke-[#B42318]/60"
      />
      <rect x="20" y="20" width="36" height="7" rx="3.5" className="fill-[#FDEBEA]" />
      {[38, 50, 62, 74].map((y) => (
        <rect key={y} x="20" y={y} width="50" height="5" rx="2.5" className="fill-sunken" />
      ))}
      <circle cx="72" cy="88" r="14" className="fill-[#FDEBEA] stroke-[#B42318]" strokeWidth="2" />
      <path
        d="M72 80 V90 M72 94 V95"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-[#B42318]"
      />
    </svg>
  );
}
