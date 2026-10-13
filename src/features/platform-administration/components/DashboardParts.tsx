import { useRef, type CSSProperties, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import { useCountUp, useEntered, useHorizontalOverflow } from './admin-motion';

export type StripStore = {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  availability_status: 'OPEN' | 'PAUSED' | 'CLOSED';
};

const MAX_TILES = 24;

/**
 * The platform seen from above: every storefront is a stall on one painted
 * kerb, lit when it is open and drawn as a dashed outline when it is paused or
 * closed. The big figure beside it is "open / all".
 */
export function StorefrontStrip({
  storefronts,
  openCount,
  play,
}: {
  storefronts: StripStore[];
  openCount: number;
  /** Light the open stalls one by one and count the figure up (first visit only). */
  play: boolean;
}) {
  const ordered = [
    ...storefronts.filter((s) => s.availability_status === 'OPEN'),
    ...storefronts.filter((s) => s.availability_status !== 'OPEN'),
  ];
  const shown = ordered.slice(0, MAX_TILES);
  const more = ordered.length - shown.length;
  const counted = useCountUp(openCount, play);
  const lit = useEntered(play);
  const railRef = useRef<HTMLUListElement>(null);
  const overflowing = useHorizontalOverflow(railRef, [shown.length]);

  return (
    <section
      aria-label="Gian hàng trên nền tảng"
      className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border/80"
    >
      <div className="grid gap-md p-md md:p-lg xl:grid-cols-[220px_minmax(0,1fr)] xl:items-end xl:gap-xl">
        <div className="flex flex-col gap-1">
          <p className="font-sign text-[44px] font-semibold leading-[1] tracking-[-0.02em] text-text font-tabular md:text-[56px] md:leading-[60px]">
            {`${counted} / ${storefronts.length}`}
          </p>
          <p className="text-headline-sm text-text">Gian hàng đang mở</p>
          <p className="text-body-sm text-muted">{`trên ${storefronts.length} gian hàng`}</p>
        </div>

        <div className="min-w-0">
          <ul
            ref={railRef}
            tabIndex={overflowing ? 0 : undefined}
            aria-label="Danh sách gian hàng"
            className={`no-scrollbar flex snap-x gap-sm overflow-x-auto px-0.5 pb-sm pt-1 ${overflowing ? '[mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)]' : ''}`}
          >
            {shown.length === 0 ? (
              <li className="flex h-[72px] min-w-[200px] items-center justify-center rounded-[10px] border-2 border-dashed border-border px-sm text-body-sm text-muted">
                Chưa có gian hàng nào
              </li>
            ) : null}
            {shown.map((store, i) => {
              const open = store.availability_status === 'OPEN';
              const style: CSSProperties | undefined = open
                ? { transitionDelay: lit ? `${i * 60}ms` : '0ms' }
                : undefined;
              return (
                <li
                  key={store.id}
                  title={store.name}
                  style={style}
                  className={[
                    'relative flex h-[72px] w-[112px] shrink-0 snap-start flex-col justify-center gap-0.5 rounded-[10px] px-2.5 transition-opacity duration-300',
                    open
                      ? `bg-card ring-2 ring-brand ${lit ? 'opacity-100' : 'opacity-40'}`
                      : 'border-2 border-dashed border-border bg-transparent',
                  ].join(' ')}
                >
                  {open ? (
                    <span aria-hidden="true" className="absolute right-2 top-2 flex h-2 w-2">
                      <span className="sb-ping absolute inset-0 rounded-full bg-tertiary opacity-60" />
                      <span className="relative h-2 w-2 rounded-full bg-tertiary" />
                    </span>
                  ) : null}
                  <span
                    className={`truncate pr-3 text-[13px] font-semibold leading-[18px] ${open ? 'text-text' : 'text-muted'}`}
                  >
                    {store.name}
                  </span>
                  {open ? (
                    <span className="font-tabular text-body-xs text-muted">
                      {store.openTime}–{store.closeTime}
                    </span>
                  ) : (
                    <span className="block origin-left scale-90">
                      <StatusChip code={store.availability_status} />
                    </span>
                  )}
                  <span className="sr-only">{open ? ', đang mở' : ''}</span>
                </li>
              );
            })}
            {more > 0 ? (
              <li className="flex h-[72px] w-[112px] shrink-0 items-center justify-center rounded-[10px] bg-sunken text-center text-body-sm font-semibold text-text">
                +{more} gian hàng
              </li>
            ) : null}
          </ul>
          <div aria-hidden="true" className="sb-kerb rounded-full" style={{ height: 8 }} />
          {storefronts.length <= 3 ? (
            <p className="mt-xs text-body-sm text-muted">Mỗi ô là một gian hàng trên nền tảng</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type Task = {
  key: string;
  icon: IconName;
  title: string;
  /** Right-aligned figure; omitted for a plain shortcut. */
  count?: number;
  hint: string;
  onPress: () => void;
};

/** What is waiting for the admin, each row a single click to the screen that handles it. */
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <section
      aria-labelledby="platform-tasks-title"
      className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border/80"
    >
      <h2
        id="platform-tasks-title"
        className="px-md pb-xs pt-md font-sign text-[18px] font-bold text-text md:px-lg"
      >
        Việc cần làm
      </h2>
      <ul className="divide-y divide-border">
        {tasks.map((task) => {
          const waiting = (task.count ?? 0) > 0;
          return (
            <li key={task.key}>
              <button
                type="button"
                onClick={task.onPress}
                aria-label={
                  task.count !== undefined
                    ? `${task.title}: ${task.count}, ${task.hint}`
                    : `${task.title}, ${task.hint}`
                }
                className={[
                  'group flex min-h-[64px] w-full items-center gap-sm border-l-4 px-md py-sm text-left transition-colors duration-150 md:px-lg',
                  waiting
                    ? 'border-l-brand bg-tint-primary hover:bg-tint-primary/70'
                    : 'border-l-transparent hover:bg-sunken',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${waiting ? 'bg-card text-primary shadow-card' : 'bg-sunken text-muted'}`}
                >
                  <Icon
                    name={task.icon}
                    size={20}
                    color="currentColor"
                    weight={waiting ? 'fill' : 'regular'}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-headline-sm text-text">{task.title}</span>
                  <span className="block truncate text-body-sm text-muted">{task.hint}</span>
                </span>
                {task.count !== undefined ? (
                  <span
                    className={`font-sign text-[28px] font-semibold leading-none font-tabular ${waiting ? 'text-primary' : 'text-text'}`}
                  >
                    {task.count.toLocaleString('vi-VN')}
                  </span>
                ) : null}
                <Icon
                  name="chevron-right"
                  size={20}
                  color="currentColor"
                  className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * A figure with what it is made of underneath. When `onPress` is given the
 * heading row is the button (it keeps the panel's label as its name).
 */
export function CountPanel({
  label,
  value,
  icon,
  onPress,
  children,
  className = '',
}: {
  label: string;
  value: number;
  icon: IconName;
  onPress?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const head = (
    <>
      <span className="flex items-center gap-xs text-label text-muted">
        <Icon name={icon} size={18} color="currentColor" />
        {label}
      </span>
      <span className="mt-1 flex items-center justify-between gap-sm">
        <span className="font-sign text-[36px] font-semibold leading-[40px] text-text font-tabular">
          {value.toLocaleString('vi-VN')}
        </span>
        {onPress ? (
          <Icon
            name="chevron-right"
            size={20}
            color="currentColor"
            className="text-muted transition-transform duration-150 group-hover:translate-x-0.5"
          />
        ) : null}
      </span>
    </>
  );

  return (
    <section
      aria-label={label}
      className={`flex min-h-[188px] flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border/80 transition-shadow duration-150 md:p-lg ${onPress ? 'hover:ring-muted/40' : ''} ${className}`}
    >
      {onPress ? (
        <button
          type="button"
          onClick={onPress}
          aria-label={`${label}: ${value}`}
          className="group -m-xs flex flex-col rounded-[14px] p-xs text-left"
        >
          {head}
        </button>
      ) : (
        <div className="flex flex-col">{head}</div>
      )}
      {children}
    </section>
  );
}

/** Two parts of one whole (fixed / itinerant vendors) as a split bar with its legend. */
export function SplitBar({
  parts,
}: {
  parts: { label: string; value: number; className: string }[];
}) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="flex flex-col gap-xs">
      <div
        role="img"
        aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}
        className="flex h-2.5 overflow-hidden rounded-full bg-sunken"
      >
        {total > 0
          ? parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <span
                  key={p.label}
                  style={{ width: `${(p.value / total) * 100}%` }}
                  className={`h-full border-r-2 border-card last:border-r-0 ${p.className}`}
                />
              ))
          : null}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-1 text-body-sm">
        {parts.map((p) => (
          <div key={p.label} className="contents">
            <dt className="flex items-center gap-1.5 text-muted">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[3px] ${p.className}`} />
              {p.label}
            </dt>
            <dd className="font-sign font-semibold text-text font-tabular">{p.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
