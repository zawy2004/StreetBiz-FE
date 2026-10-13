import { useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import { statusLabel } from '@/core/constants/status-labels';
import { statusTones } from '@/theme';

export type QueueTabOption<T extends string> = { value: T; label: string; count?: number };

/**
 * The two queues as tabs (same labels, `tablist`/`tab`/`aria-selected` as the
 * shared SegmentedControl), with a count badge when that queue is already in
 * the cache. Left/right arrows move between them.
 */
export function QueueTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: QueueTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (index: number) => (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      className="flex w-full gap-1 rounded-[14px] border border-border bg-card p-1 shadow-card sm:w-fit"
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={onKey(i)}
            className={[
              'flex h-11 min-w-0 flex-1 items-center justify-center gap-xs rounded-[10px] px-md text-label transition-colors duration-150 sm:flex-none',
              active
                ? 'bg-primary font-semibold text-on-primary shadow-card'
                : 'text-muted hover:bg-sunken hover:text-text',
            ].join(' ')}
          >
            <span className="truncate">{opt.label}</span>
            {opt.count !== undefined ? (
              <>
                <span className="sr-only">{` (${opt.count})`}</span>
                <span
                  aria-hidden="true"
                  className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-badge font-tabular ${active ? 'bg-white/25 text-on-primary' : 'bg-sunken text-muted'}`}
                >
                  {opt.count}
                </span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** One chip per status in the open queue, with its count; pressing one narrows the list here. */
export function StatusCountChips({
  counts,
  active,
  onToggle,
}: {
  counts: [string, number][];
  active?: string;
  onToggle: (status: string) => void;
}) {
  if (counts.length === 0) return null;
  return (
    <div
      role="group"
      aria-label="Lọc theo trạng thái"
      className="no-scrollbar -mx-md flex gap-xs overflow-x-auto px-md py-0.5 md:mx-0 md:px-0"
    >
      {counts.map(([status, count]) => {
        const { label, tone } = statusLabel(status);
        const colors = statusTones[tone];
        const pressed = active === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(status)}
            style={
              pressed
                ? {
                    backgroundColor: colors.fg,
                    color: 'rgb(var(--c-card))',
                    borderColor: colors.fg,
                  }
                : { backgroundColor: colors.bg, color: colors.fg, borderColor: colors.border }
            }
            className="inline-flex h-11 shrink-0 items-center gap-xs rounded-[8px] border px-sm text-badge transition-colors duration-150"
          >
            {label.toUpperCase()}
            <span className="font-sign text-[14px] font-bold font-tabular">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export type Ticket = {
  key: string | number;
  icon: IconName;
  /** "Gian hàng" / "Khiếu nại" … above the title. */
  kind: string;
  title: string;
  status: string;
  body: string;
  meta: ReactNode;
  needsAction: boolean;
  /** "3 ngày" while waiting. */
  wait: string | null;
  waitDays: number;
  /** When it was filed, to find the one that has waited longest. */
  createdAtMs: number;
  /** "02/10/2026" once done. */
  doneOn: string | null;
  onPress: () => void;
};

/**
 * A ticket with a stub, like the receipt slip at a one-stop counter. The stub
 * says how long the item has waited (or when it was done), cut from the body
 * by a perforated line. The whole ticket is the button.
 */
export function QueueTicket({
  ticket,
  style,
  animate,
}: {
  ticket: Ticket;
  style?: CSSProperties;
  animate: boolean;
}) {
  const name = [
    ticket.kind,
    ticket.title,
    statusLabel(ticket.status).label,
    ticket.needsAction
      ? ticket.wait
        ? `chờ ${ticket.wait}`
        : null
      : ticket.doneOn
        ? `xong ${ticket.doneOn}`
        : 'đã xử lý',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <li style={style} className={animate ? 'sb-pop' : undefined}>
      <button
        type="button"
        aria-label={name}
        onClick={ticket.onPress}
        className="group relative flex min-h-[104px] w-full overflow-hidden rounded-[14px] bg-card text-left shadow-card ring-1 ring-border transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover"
      >
        <span
          aria-hidden="true"
          className={`flex w-[72px] shrink-0 flex-col items-center justify-center gap-1 px-1 text-center transition-colors duration-200 md:w-[96px] ${
            ticket.needsAction
              ? 'bg-tint-primary group-hover:bg-[rgb(var(--c-primary)/0.16)]'
              : 'bg-sunken'
          }`}
        >
          <Icon
            name={ticket.icon}
            size={20}
            color="currentColor"
            className={ticket.needsAction ? 'text-primary' : 'text-muted'}
          />
          {ticket.needsAction ? (
            <>
              <span
                className={`font-sign text-[18px] font-semibold leading-[22px] font-tabular md:text-[22px] md:leading-[26px] ${ticket.waitDays >= 3 ? 'text-primary' : 'text-text'}`}
              >
                {ticket.wait ?? '—'}
              </span>
              <span className="text-body-xs text-muted">đang chờ</span>
            </>
          ) : (
            <>
              <span className="font-sign text-[16px] font-semibold leading-5 text-muted">Xong</span>
              {ticket.doneOn ? (
                <span className="text-body-xs text-muted font-tabular">
                  {ticket.doneOn.slice(0, 5)}
                </span>
              ) : null}
            </>
          )}
        </span>
        {/* Perforation: a dashed rule with two half-circle notches. */}
        <span
          aria-hidden="true"
          className="relative w-0 shrink-0 border-l-2 border-dashed border-border"
        >
          <span className="absolute -left-[6px] -top-[5px] h-2.5 w-2.5 rounded-full bg-bg ring-1 ring-border" />
          <span className="absolute -bottom-[5px] -left-[6px] h-2.5 w-2.5 rounded-full bg-bg ring-1 ring-border" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 py-sm pl-md pr-xl">
          <span className="flex flex-wrap items-start justify-between gap-x-sm gap-y-1">
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm text-muted">{ticket.kind}</span>
              <span
                className="block truncate text-[16px] font-semibold leading-[22px] text-text"
                title={ticket.title}
              >
                {ticket.title}
              </span>
            </span>
            <StatusChip code={ticket.status} />
          </span>
          <span className="line-clamp-2 text-body-md text-muted">{ticket.body}</span>
          <span className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-sm text-text">
            {ticket.meta}
          </span>
        </span>
        <Icon
          name="chevron-right"
          size={20}
          color="currentColor"
          className="absolute right-sm top-1/2 -translate-y-1/2 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </button>
    </li>
  );
}

/** A titled group of tickets ("Cần xử lý" / "Đã xử lý"). */
export function QueueGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-sm">
      <h2
        id={headingId}
        className="flex items-baseline gap-xs text-[15px] font-semibold leading-[22px] text-text"
      >
        {title}
        <span aria-hidden="true" className="font-sign text-body-sm text-muted font-tabular">
          {count}
        </span>
      </h2>
      {children}
    </section>
  );
}

/**
 * The queue at a glance: needing action against done as one bar, the item that
 * has waited longest, and an honest "showing n of total" when the server has more.
 */
export function QueueSummary({
  open,
  done,
  longest,
  shown,
  total,
  layout,
}: {
  open: number;
  done: number;
  longest: string | null;
  shown: number;
  total: number;
  layout: 'column' | 'band';
}) {
  const all = open + done;
  const bar = (
    <div
      role="img"
      aria-label={`${open} cần xử lý, ${done} đã xử lý`}
      className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      {all > 0 ? (
        <>
          <span className="h-full bg-brand" style={{ width: `${(open / all) * 100}%` }} />
          <span className="h-full bg-muted/35" style={{ width: `${(done / all) * 100}%` }} />
        </>
      ) : null}
    </div>
  );
  const more = total > shown ? `Đang hiện ${shown} trên ${total} mục` : null;

  if (layout === 'band') {
    return (
      <div className="flex flex-col gap-xs rounded-[14px] bg-card px-md py-sm ring-1 ring-border/80">
        <div className="flex flex-wrap items-baseline gap-x-md gap-y-1 text-body-sm text-muted">
          <span>
            <span className="font-sign text-[18px] font-semibold text-text font-tabular">
              {open} / {all}
            </span>{' '}
            cần xử lý
          </span>
          {longest ? <span>Chờ lâu nhất: {longest}</span> : null}
          {more ? <span>{more}</span> : null}
        </div>
        {bar}
      </div>
    );
  }

  return (
    <aside
      aria-label="Tóm tắt hàng đợi"
      className="sticky top-0 flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80"
    >
      <p className="font-sign text-[18px] font-bold text-text">Tóm tắt</p>
      <div className="flex flex-col gap-xs">
        <p className="font-sign text-[34px] font-semibold leading-none text-text font-tabular">
          {open} <span className="text-[20px] text-muted">/ {all}</span>
        </p>
        <p className="text-body-sm text-muted">cần xử lý</p>
        {bar}
      </div>
      {longest ? (
        <div className="rounded-[12px] bg-tint-primary px-sm py-xs">
          <p className="text-body-sm text-muted">Chờ lâu nhất</p>
          <p className="font-sign text-[20px] font-semibold text-primary font-tabular">{longest}</p>
        </div>
      ) : null}
      <p className="text-body-sm text-muted">{more ?? `Đang hiện đủ ${shown} mục`}</p>
    </aside>
  );
}

/** Four ticket outlines while a queue loads. */
export function QueueSkeleton() {
  return (
    <ul role="status" aria-label="Đang tải hàng đợi" className="flex flex-col gap-sm">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex min-h-[104px] overflow-hidden rounded-[14px] bg-card ring-1 ring-border"
        >
          <span className="w-[72px] bg-sunken md:w-[96px]" />
          <span className="flex flex-1 flex-col gap-sm p-md">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </span>
        </li>
      ))}
    </ul>
  );
}
