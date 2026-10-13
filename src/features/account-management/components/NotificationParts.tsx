import type { CSSProperties } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import type { NotificationItem } from '../notifications-api';
import { relativeTime } from './account-format';

/** The bell over the counter, with a live ping while something is unread. */
function BellArt({ ringing }: { ringing: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-14 w-14 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 56 56" className="h-14 w-14">
        <circle
          cx="28"
          cy="28"
          r="27"
          fill="#FFF3E8"
          className="dark:fill-[rgb(var(--c-primary)/0.12)]"
        />
        <path
          d="M28 13c-6.6 0-11 4.9-11 11.4v6.3l-3.2 5.1c-.6 1 .1 2.2 1.3 2.2h25.8c1.2 0 1.9-1.2 1.3-2.2L39 30.7v-6.3C39 17.9 34.6 13 28 13z"
          fill="rgb(var(--c-primary))"
        />
        <path d="M23.5 41a4.6 4.6 0 0 0 9 0z" fill="rgb(var(--c-text))" />
        <rect x="26" y="9.5" width="4" height="5" rx="2" fill="rgb(var(--c-text))" />
      </svg>
      {ringing ? (
        <span className="absolute right-1 top-1 flex h-3.5 w-3.5">
          <span className="sb-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-card" />
        </span>
      ) : null}
    </span>
  );
}

/** "3 chưa đọc", or a green "Đã đọc hết" once nothing is left. */
export function UnreadCounter({ unread, total }: { unread: number; total: number }) {
  if (unread === 0) {
    return (
      <div className="flex items-center gap-sm">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E6F6EC] text-tertiary dark:bg-tertiary/15"
        >
          <Icon name="check-circle" size={32} color="currentColor" weight="fill" />
        </span>
        <div className="flex flex-col">
          <p className="font-sign text-[28px] font-bold leading-8 text-tertiary">Đã đọc hết</p>
          <p className="text-body-sm text-muted">trong {total} thông báo gần nhất</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-sm">
      <BellArt ringing />
      <div className="flex min-w-0 flex-col">
        <p className="flex items-baseline gap-xs">
          <span className="font-sign text-[40px] font-bold leading-[44px] text-primary-pressed font-tabular lg:text-[52px] lg:leading-[56px]">
            {unread}
          </span>
          <span className="text-headline-md text-text">chưa đọc</span>
        </p>
        <p className="text-body-sm text-muted">trong {total} thông báo gần nhất</p>
      </div>
    </div>
  );
}

const sentAtFormat = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString('vi-VN');
};

type RowProps = {
  item: NotificationItem;
  /** Position in the list, for the top-down switch-off after "Đọc hết". */
  order: number;
  onPress: () => void;
};

/**
 * A notice on the ward board. Unread ones keep a fresh orange edge on a warm
 * wash; once read they lie flat and the text softens.
 */
export function NotificationRow({ item, order, onPress }: RowProps) {
  const unread = !item.read;
  const when = sentAtFormat(item.sentAt);
  const relative = relativeTime(item.sentAt);
  return (
    <button
      type="button"
      onClick={onPress}
      style={{ '--delay': `${Math.min(order, 12) * 40}ms` } as CSSProperties}
      className={[
        'sb-acct-note relative flex min-h-[72px] w-full items-start gap-sm overflow-hidden px-md py-sm text-left transition-transform duration-100 active:scale-[0.99]',
        unread
          ? 'bg-[#FFF3E8] hover:bg-[#FFEADB] dark:bg-primary/10 dark:hover:bg-primary/15'
          : 'sb-acct-read bg-card hover:bg-sunken',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="sb-acct-unread-edge absolute inset-y-0 left-0 w-1 bg-brand"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${unread ? 'bg-card text-primary shadow-card' : 'bg-sunken text-muted'}`}
      >
        <Icon name={unread ? 'bell-ring' : 'bell-outline'} size={19} color="currentColor" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {unread ? <span className="sr-only">Chưa đọc. </span> : null}
        <span
          className={`line-clamp-2 text-headline-sm ${unread ? 'font-semibold text-text' : 'font-medium text-text/85'}`}
        >
          {item.title}
        </span>
        <span
          className={`whitespace-pre-line break-words text-body-md ${unread ? 'text-text/80' : 'text-muted'}`}
        >
          {item.body}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-xs text-body-sm text-muted">
          <span>{when}</span>
          {relative ? (
            <span className="font-sign text-[13px] font-semibold text-text/70 font-tabular">
              · {relative}
            </span>
          ) : null}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="sb-acct-unread-edge mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
      />
    </button>
  );
}

/** A day plate stuck to the top while its notices scroll under it. */
export function DayPlate({ id, label, count }: { id: string; label: string; count: number }) {
  return (
    <h2 id={id} className="sticky top-0 z-10 bg-bg/95 py-xs backdrop-blur-sm">
      <span className="inline-flex h-6 items-center rounded-[6px] bg-sunken px-2 font-sign text-[12px] font-bold uppercase leading-4 tracking-[0.06em] text-[#2B3640] dark:text-text/85">
        {label} · {count}
      </span>
    </h2>
  );
}

/** A notice board with two pinned sheets: nothing posted yet. */
export function NotificationsEmpty() {
  return (
    <div className="flex flex-col items-center px-lg py-2xl text-center">
      <svg viewBox="0 0 200 140" aria-hidden="true" className="h-[140px] w-[200px]">
        <rect x="14" y="10" width="172" height="112" rx="14" fill="rgb(var(--c-sunken))" />
        <rect
          x="14"
          y="10"
          width="172"
          height="112"
          rx="14"
          fill="none"
          stroke="rgb(var(--c-border))"
          strokeWidth="2"
        />
        <g transform="rotate(-4 66 64)">
          <rect x="34" y="30" width="64" height="70" rx="6" fill="rgb(var(--c-card))" />
          <rect x="44" y="46" width="40" height="5" rx="2.5" fill="rgb(var(--c-border))" />
          <rect x="44" y="58" width="30" height="5" rx="2.5" fill="rgb(var(--c-border))" />
          <circle cx="66" cy="32" r="5" fill="rgb(var(--c-brand))" />
        </g>
        <g transform="rotate(5 134 64)">
          <rect x="104" y="34" width="60" height="62" rx="6" fill="rgb(var(--c-card))" />
          <rect x="114" y="50" width="38" height="5" rx="2.5" fill="rgb(var(--c-border))" />
          <rect x="114" y="62" width="24" height="5" rx="2.5" fill="rgb(var(--c-border))" />
          <circle cx="134" cy="36" r="5" fill="rgb(var(--c-accent))" />
        </g>
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={14 + i * 21.5}
            y="128"
            width="21.5"
            height="6"
            fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))'}
          />
        ))}
      </svg>
      <p className="mt-md font-heading text-[19px] font-bold text-text">Chưa có thông báo</p>
      <p className="mt-1 max-w-[46ch] text-body-md text-muted">
        Khi phí đến hạn, hồ sơ có kết quả hay có đơn mới, thông báo sẽ hiện ở đây.
      </p>
    </div>
  );
}

/** Loading: counter, button and five rows at their real sizes. */
export function NotificationsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-md">
      <div className="flex items-center justify-between gap-md">
        <Skeleton className="h-11 w-14" />
        <Skeleton className="h-12 w-[120px] rounded-[12px]" />
      </div>
      <div className="flex max-w-[640px] flex-col gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}
