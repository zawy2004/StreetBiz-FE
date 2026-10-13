import { useId, type CSSProperties } from 'react';

import { Icon, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import { statusLabel } from '@/core/constants/status-labels';
import { useCountUp, useGrown } from '../count-up';
import {
  BUCKET_LABEL,
  BUCKET_ORDER,
  bucketOf,
  plateLabel,
  slotSize,
  type BucketCounts,
  type OccupancyBucket,
  type OccupancyRow,
  type PlaceGroup,
} from './occupancy-model';

/**
 * One colour per state, used for the bar, the legend dots and the filter chips.
 * Each is at least 3:1 on white (non-text contrast); the words always go with it.
 * Rented is the street orange of an occupied stall, free the leaf green of "open".
 */
const BUCKET_SWATCH: Record<OccupancyBucket, string> = {
  rented: 'bg-primary',
  free: 'bg-tertiary',
  pending: 'bg-[#A86B00] dark:bg-[#FFD27A]',
  suspended: 'bg-[#B42318] dark:bg-[#FF9A90]',
  other: 'bg-muted',
};

const PLATE: Record<OccupancyBucket, { box: string; ink: string }> = {
  free: {
    box: 'bg-card border-2 border-dashed border-[#0B7F43] dark:border-[#8BE3B0]',
    ink: 'text-[#0B5D33] dark:text-[#8BE3B0]',
  },
  rented: { box: 'bg-sunken border border-border', ink: 'text-text' },
  pending: {
    box: 'bg-[#FFF3D1] border border-[#6B4100]/20 dark:bg-[#3A2A08] dark:border-[#FFD27A]/25',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
  },
  suspended: {
    box: 'border border-[#8F1717]/20 bg-[repeating-linear-gradient(135deg,#FDEBEA_0_6px,#F8D7D4_6px_8px)] dark:border-[#FF9A90]/25 dark:bg-[repeating-linear-gradient(135deg,#3A1414_0_6px,#4A1C1C_6px_8px)]',
    ink: 'text-[#8F1717] dark:text-[#FF9A90]',
  },
  other: {
    box: 'bg-[#EEF1F4] border border-border dark:bg-[#1D2833]',
    ink: 'text-[#2B3640] dark:text-[#C5D0DA]',
  },
};

/**
 * The headline count, "14/24 ô đang cho thuê", and a stacked bar of the four
 * states with a legend that carries the numbers in words. The number counts up
 * and the bar grows from zero when the data lands.
 */
export function OccupancySummary({ counts }: { counts: BucketCounts }) {
  const rented = useCountUp(counts.rented);
  const grown = useGrown();
  const parts = BUCKET_ORDER.filter((b) => counts[b] > 0);
  const spoken = parts.map((b) => `${counts[b]} ${BUCKET_LABEL[b].toLowerCase()}`).join(', ');

  return (
    <section
      aria-label="Tình trạng lấp đầy"
      aria-live="polite"
      className="sb-rise overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md p-md md:p-lg xl:flex-row xl:items-center xl:gap-2xl">
        <div className="flex shrink-0 items-end gap-sm">
          <p className="font-sign text-[44px] font-extrabold leading-[0.9] tracking-[-0.02em] text-text [font-stretch:86%] md:text-[56px]">
            <span aria-hidden="true" className="font-tabular">
              {rented}
              <span className="text-muted">/{counts.total}</span>
            </span>
            <span className="sr-only">
              {counts.rented}/{counts.total}
            </span>
          </p>
          <p className="pb-1 text-body-lg font-semibold leading-tight text-text">
            ô đang
            <br />
            cho thuê
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-sm">
          <div
            role="img"
            aria-label={spoken || 'Chưa có ô'}
            className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-sunken"
          >
            {parts.map((b) => (
              <span
                key={b}
                className={`h-full rounded-full transition-[flex-grow] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${BUCKET_SWATCH[b]}`}
                style={{ flexGrow: grown ? counts[b] : 0, flexBasis: 0 }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-md gap-y-1 sm:flex sm:flex-wrap sm:gap-x-lg">
            {BUCKET_ORDER.filter((b) => b !== 'other' || counts.other > 0).map((b) => (
              <li key={b} className="flex items-center gap-xs text-body-md text-text">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${BUCKET_SWATCH[b]}`}
                />
                {BUCKET_LABEL[b]}
                <span className="font-sign font-bold font-tabular">{counts[b]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export type BucketFilter = OccupancyBucket | 'all';

/** Status chips that double as the legend, each with its count; the chosen one turns orange. */
export function BucketChips({
  counts,
  value,
  onChange,
}: {
  counts: BucketCounts;
  value: BucketFilter;
  onChange: (next: BucketFilter) => void;
}) {
  const options: { key: BucketFilter; label: string; n: number }[] = [
    { key: 'all', label: 'Tất cả', n: counts.total },
    ...(['free', 'pending', 'rented', 'suspended', 'other'] as OccupancyBucket[])
      .filter((b) => b !== 'other' || counts.other > 0)
      .map((b) => ({ key: b, label: BUCKET_LABEL[b], n: counts[b] })),
  ];
  return (
    <div
      role="group"
      aria-label="Lọc theo trạng thái"
      className="no-scrollbar -mx-md flex gap-xs overflow-x-auto px-md md:mx-0 md:flex-wrap md:px-0"
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.key)}
            className={[
              'flex h-12 shrink-0 items-center gap-xs rounded-full px-md text-body-md font-semibold transition-colors duration-150',
              active
                ? 'bg-primary text-on-primary shadow-[0_8px_18px_-12px_rgb(var(--c-primary)/0.9)]'
                : 'bg-card text-text ring-1 ring-inset ring-border hover:bg-sunken',
            ].join(' ')}
          >
            {opt.key !== 'all' ? (
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${BUCKET_SWATCH[opt.key]} ${active ? 'ring-2 ring-on-primary' : ''}`}
              />
            ) : null}
            {opt.label}
            <span className="font-sign font-bold font-tabular opacity-90">{opt.n}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Code search: a plain field with a magnifier, filtering on the client only. */
export function CodeSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative flex h-12 min-w-0 flex-1 items-center rounded-[12px] bg-card ring-1 ring-inset ring-border focus-within:ring-2 focus-within:ring-primary md:max-w-[320px]">
      <Icon
        name="magnify"
        size={20}
        color="currentColor"
        className="pointer-events-none absolute left-sm text-muted"
      />
      <span className="sr-only">Tìm theo mã ô</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm theo mã ô"
        maxLength={30}
        className="h-full w-full min-w-0 rounded-[12px] bg-transparent pl-[44px] pr-sm text-body-lg text-text outline-none placeholder:text-muted/80"
      />
    </label>
  );
}

const FACILITIES: {
  key: 'hasPower' | 'hasWater' | 'hasTrashBin';
  icon: IconName;
  label: string;
}[] = [
  { key: 'hasPower', icon: 'flash-outline', label: 'Có điện' },
  { key: 'hasWater', icon: 'water-outline', label: 'Có nước' },
  { key: 'hasTrashBin', icon: 'trash-can-outline', label: 'Có thùng rác' },
];

function facilityList(row: OccupancyRow) {
  return FACILITIES.filter((f) => row[f.key]);
}

/** The little stall seen from above (as on the patrol plan): an occupied slot. */
function StallGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 16" className="h-4 w-6 shrink-0">
      <rect x="1" y="2" width="15" height="12" rx="3" className="fill-primary" />
      <circle cx="20" cy="5" r="2.6" className="fill-tertiary" />
      <circle cx="20" cy="11.5" r="2.6" className="fill-tertiary" />
    </svg>
  );
}

/**
 * One slot as a painted plate on the pavement. The state reads by shape as well
 * as colour: dashed outline when free, solid with a stall when rented, a mango
 * wash while applied for, red hatching when suspended.
 */
export function SlotPlate({ row, delayMs }: { row: OccupancyRow; delayMs?: number }) {
  const bucket = bucketOf(row.status);
  const plate = PLATE[bucket];
  const size = slotSize(row);
  const facilities = facilityList(row);
  const { label } = statusLabel(row.status);
  const spoken = [
    plateLabel(row, label),
    ...facilities.map((f) => f.label.toLowerCase()),
    row.vendorProposed ? 'do hộ kinh doanh đề xuất' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <li
      className={`${delayMs != null ? 'sb-rise' : ''} relative flex min-h-[112px] min-w-0 flex-col justify-between gap-xs rounded-[14px] p-sm ${plate.box}`}
      style={delayMs != null ? ({ '--delay': `${delayMs}ms` } as CSSProperties) : undefined}
    >
      <span className="sr-only">{spoken}</span>
      <div aria-hidden="true" className="flex items-start justify-between gap-xs">
        <span
          title={row.code}
          className={`min-w-0 break-all font-sign text-[20px] font-extrabold leading-none tracking-[0.02em] [font-stretch:70%] ${plate.ink} ${row.code.length > 12 ? 'text-[16px]' : ''}`}
        >
          {row.code}
        </span>
        {bucket === 'rented' ? (
          <StallGlyph />
        ) : bucket === 'free' ? (
          <span className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0">
            <span className="sb-ping absolute inset-0 rounded-full bg-tertiary opacity-60" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-tertiary" />
          </span>
        ) : null}
      </div>
      <div aria-hidden="true">
        <StatusChip code={row.status} />
      </div>
      <div
        aria-hidden="true"
        className="flex min-h-5 flex-wrap items-center gap-x-sm gap-y-1 text-body-sm font-medium text-text/80"
      >
        {size ? <span className="font-tabular">{size}</span> : null}
        {facilities.length > 0 ? (
          <span className="flex items-center gap-1">
            {facilities.map((f) => (
              <span key={f.key} title={f.label}>
                <Icon name={f.icon} size={15} color="currentColor" />
              </span>
            ))}
          </span>
        ) : null}
        {row.vendorProposed ? (
          <span title="Do hộ kinh doanh đề xuất" className="flex items-center">
            <Icon name="storefront-outline" size={15} color="currentColor" />
          </span>
        ) : null}
      </div>
    </li>
  );
}

/**
 * A street as a strip of pavement: its name, how much of it is let, the painted
 * kerb, then its slots. Can be folded when the ward has many streets.
 */
export function ZoneKerbStrip({
  group,
  rows,
  collapsed,
  onToggle,
  rise,
}: {
  group: PlaceGroup<OccupancyRow>;
  /** The group's rows that pass the current filter. */
  rows: OccupancyRow[];
  collapsed: boolean;
  onToggle: () => void;
  /** Stagger the first plates in (only for the first street, once). */
  rise?: boolean;
}) {
  const headingId = useId();
  const { counts } = group;
  const share = counts.total ? counts.rented / counts.total : 0;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-md gap-y-xs">
        <h2
          id={headingId}
          title={group.place}
          className="min-w-0 max-w-full truncate font-sign text-[22px] font-bold leading-tight tracking-[-0.01em] text-text [font-stretch:92%]"
        >
          {group.place}
        </h2>
        <div className="flex items-center gap-sm">
          <span className="text-body-md text-text">
            <span className="font-sign font-bold font-tabular">
              {counts.rented}/{counts.total}
            </span>{' '}
            ô đang cho thuê
          </span>
          <span
            aria-hidden="true"
            className="hidden h-2 w-20 overflow-hidden rounded-full bg-sunken sm:block"
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${share * 100}%` }}
            />
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="flex h-12 items-center gap-1 rounded-[10px] px-sm text-body-sm font-semibold text-primary hover:bg-tint-primary"
          >
            <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color="currentColor" />
            {collapsed ? 'Mở rộng' : 'Thu gọn'}
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin rounded-full" />
      {collapsed ? null : rows.length === 0 ? (
        <p className="text-body-sm text-muted">Không có ô nào của tuyến này khớp bộ lọc.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-xs md:gap-sm">
          {rows.map((row, i) => (
            <SlotPlate key={row.key} row={row} delayMs={rise && i < 12 ? i * 30 : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The dense view for cross-checking or printing: one line per slot. */
export function OccupancyList({ rows }: { rows: OccupancyRow[] }) {
  return (
    <ul className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border">
      {rows.map((row) => {
        const size = slotSize(row);
        const facilities = facilityList(row);
        return (
          <li
            key={row.key}
            className="flex min-h-14 flex-wrap items-center gap-x-md gap-y-1 border-b border-border px-md py-sm last:border-b-0"
          >
            <span className="w-[96px] shrink-0 font-sign text-[18px] font-extrabold leading-none text-text [font-stretch:72%]">
              {row.code}
            </span>
            <span className="min-w-0 flex-1 text-body-md text-text">
              <span className="block truncate" title={row.place}>
                {row.place}
              </span>
              <span className="block text-body-sm text-muted">
                {[
                  size,
                  ...facilities.map((f) => f.label.toLowerCase()),
                  row.vendorProposed ? 'do hộ kinh doanh đề xuất' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Chưa có kích thước'}
              </span>
            </span>
            <StatusChip code={row.status} />
          </li>
        );
      })}
    </ul>
  );
}

/** First load: the count block, a row of chips and two streets of plates, in their real shapes. */
export function OccupancySkeleton() {
  return (
    <div role="status" className="flex flex-col gap-lg">
      <span className="sr-only">Đang tải…</span>
      <div className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
        <div className="flex flex-col gap-md p-md md:p-lg xl:flex-row xl:items-center xl:gap-2xl">
          <Skeleton className="h-[56px] w-[180px]" />
          <div className="flex flex-1 flex-col gap-sm">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
      <div className="flex gap-xs overflow-hidden">
        {['w-[88px]', 'w-[120px]', 'w-[128px]', 'w-[150px]', 'w-[112px]'].map((w) => (
          <Skeleton key={w} className={`h-12 shrink-0 rounded-full ${w}`} />
        ))}
      </div>
      {[0, 1].map((g) => (
        <div key={g} className="flex flex-col gap-sm">
          <Skeleton className="h-7 w-[240px]" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-sm">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[112px] rounded-[14px]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
