import { Fragment, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { Icon, Money, type IconName } from '@/components/common';
import {
  formatOrderDate,
  formatOrderTime,
  formatWait,
  minutesSince,
  OrderStatusBadge,
  ticketItemsShown,
  waitTone,
  type PipelineStage,
  type StageTone,
} from '@/features/orders/components';
import type { Order } from '@/features/orders/types/order.types';
import { playOnce } from '@/features/food-safety/components/motion';
import { enteredStageAt, providerLabel } from '../../orders-view';

// Full class names, so Tailwind keeps them.
const STATION: Record<StageTone, { on: string; count: string; kerb: string }> = {
  chili: {
    on: 'border-solid border-primary bg-[#FFF3E8] shadow-[0_12px_26px_-16px_rgb(var(--c-primary)/0.9)] dark:bg-primary/15',
    count: 'text-primary',
    kerb: 'after:bg-[repeating-linear-gradient(90deg,rgb(var(--c-primary))_0_14px,rgb(var(--c-kerb-paint))_14px_28px)]',
  },
  ink: {
    on: 'border-solid border-indigo bg-tint-indigo shadow-[0_12px_26px_-16px_rgb(var(--c-indigo)/0.9)]',
    count: 'text-indigo',
    kerb: 'after:bg-[repeating-linear-gradient(90deg,rgb(var(--c-indigo))_0_14px,rgb(var(--c-kerb-paint))_14px_28px)]',
  },
  turmeric: {
    on: 'border-solid border-secondary bg-[#FFF3D1] shadow-[0_12px_26px_-16px_rgb(var(--c-secondary)/0.9)] dark:bg-secondary/15',
    count: 'text-on-secondary',
    kerb: 'after:bg-[repeating-linear-gradient(90deg,rgb(var(--c-secondary))_0_14px,rgb(var(--c-kerb-paint))_14px_28px)]',
  },
  leaf: {
    on: 'border-solid border-tertiary bg-[#E6F6EC] shadow-[0_12px_26px_-16px_rgb(var(--c-tertiary)/0.9)] dark:bg-tertiary/15',
    count: 'text-tertiary',
    kerb: 'after:bg-[repeating-linear-gradient(90deg,rgb(var(--c-tertiary))_0_14px,rgb(var(--c-kerb-paint))_14px_28px)]',
  },
  quiet: { on: 'border-solid border-muted bg-sunken', count: 'text-text', kerb: 'after:bg-border' },
};

/**
 * The four stages of the stall's kitchen as four painted pavement slots, each
 * with how many orders stand in it, readable from arm's length. It is the tab
 * bar too. Inside a tab there is only the count, then the stage name: the lit
 * slot's kerb stripe is drawn by CSS, not by an element.
 */
export function KitchenStations<T extends string>({
  stages,
  value,
  onChange,
  label,
}: {
  stages: PipelineStage<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const before = useRef<Partial<Record<string, number>>>({});
  const bumped = useRef<Partial<Record<string, number>>>({});
  // A count that went up gets a fresh key, so its number pops once.
  for (const stage of stages) {
    const previous = before.current[stage.value];
    if (stage.count !== undefined && previous !== undefined && stage.count > previous)
      bumped.current[stage.value] = (bumped.current[stage.value] ?? 0) + 1;
  }
  useEffect(() => {
    for (const stage of stages)
      if (stage.count !== undefined) before.current[stage.value] = stage.count;
  });

  // Arrow keys move between stages, as in any tab bar.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const index = stages.findIndex((stage) => stage.value === value);
    const next = stages[(index + step + stages.length) % stages.length];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-stage="${next.value}"]`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex items-stretch gap-[4px] min-[380px]:gap-0"
      onKeyDown={onKeyDown}
    >
      {stages.map((stage, index) => {
        const selected = stage.value === value;
        const busy = (stage.count ?? 0) > 0;
        const look = STATION[stage.tone];
        return (
          <Fragment key={stage.value}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="hidden w-3 shrink-0 items-center justify-center text-muted/60 min-[380px]:flex sm:w-6"
              >
                <Icon name="chevron-right" size={16} />
              </span>
            ) : null}
            <button
              type="button"
              role="tab"
              data-stage={stage.value}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(stage.value)}
              className={[
                'relative flex min-h-16 min-w-0 flex-1 flex-col items-start overflow-hidden rounded-[14px] border-2 px-[6px] pb-sm pt-xs text-left transition-[background-color,border-color,box-shadow] duration-200 sm:px-md sm:pb-md sm:pt-sm',
                "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-1.5 after:content-['']",
                selected
                  ? `${look.on} ${look.kerb}`
                  : 'border-dashed border-border bg-card after:hidden hover:bg-sunken',
              ].join(' ')}
            >
              <span
                key={bumped.current[stage.value] ?? 0}
                className={[
                  'font-sign text-[28px] font-bold leading-none tabular-nums [font-stretch:90%] md:text-[48px] xl:text-[64px]',
                  bumped.current[stage.value] ? 'sb-pop' : '',
                  busy ? look.count : 'text-muted/70',
                ].join(' ')}
              >
                {stage.count ?? '–'}
              </span>
              <span
                className={[
                  'mt-1 w-full whitespace-nowrap text-[12px] min-[380px]:text-body-sm sm:text-label md:text-[15px]',
                  selected ? 'font-bold text-text' : 'font-medium text-muted',
                ].join(' ')}
              >
                {stage.label}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

const EDGE: Record<StageTone, string> = {
  chili: 'bg-primary',
  ink: 'bg-indigo',
  turmeric: 'bg-secondary',
  leaf: 'bg-tertiary',
  quiet: 'bg-border',
};

const WAIT: Record<'calm' | 'warn' | 'late', string> = {
  calm: 'bg-sunken text-muted',
  warn: 'bg-secondary/15 text-on-secondary',
  late: 'bg-error/10 text-error',
};

// The torn top edge of a paper ticket (8px teeth), cut with a mask.
const TORN_EDGE = {
  WebkitMask:
    'linear-gradient(#000 0 0) 0 7px / 100% calc(100% - 7px) no-repeat, conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 14px 7px repeat-x',
  mask: 'linear-gradient(#000 0 0) 0 7px / 100% calc(100% - 7px) no-repeat, conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 14px 7px repeat-x',
};

/**
 * An order as the cook reads it: a paper kitchen ticket with a torn top. What
 * to make comes first, quantity before name, the buyer's note on a mango slip;
 * who it is for and how long it has waited sit above; money and the next step
 * below the perforation. Same rules as the order module's ticket (the wait
 * only turns urgent for a new order).
 */
export function KitchenTicket({
  order,
  tone,
  live,
  showStatus = false,
  now,
  fresh = false,
  primaryAction,
  secondaryActions,
}: {
  order: Order;
  tone: StageTone;
  live: boolean;
  showStatus?: boolean;
  now: number;
  /** A new order that arrived while the board was open: it prints in. */
  fresh?: boolean;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const born = useRef(fresh);
  useEffect(() => {
    if (!born.current) return;
    playOnce(
      sheet.current,
      [
        { transform: 'translateY(-16px)', clipPath: 'inset(0 0 100% 0)' },
        { transform: 'translateY(0)', clipPath: 'inset(0 0 0% 0)' },
      ],
      { duration: 460 },
    );
  }, []);

  const waited = minutesSince(enteredStageAt(order), now);
  // Only a new order is urgent by age: once accepted, the buyer has been told.
  const urgency = order.orderStatus === 'PLACED' ? waitTone(waited) : 'calm';
  const shown = order.items.slice(0, ticketItemsShown(order.items.length));
  const hidden = order.items.length - shown.length;
  const placedAt = order.placedAt ?? order.createdAt;

  return (
    <div
      ref={sheet}
      className="[filter:drop-shadow(0_1px_1px_rgb(17_28_43/0.10))_drop-shadow(0_8px_18px_rgb(17_28_43/0.08))]"
    >
      <article
        aria-label={`Đơn ${order.orderCode}`}
        style={TORN_EDGE}
        className="relative flex h-full flex-col overflow-hidden rounded-b-[12px] bg-card"
      >
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${EDGE[tone]}`} />

        <header className="flex items-start justify-between gap-sm pb-sm pl-lg pr-sm pt-md">
          <div className="min-w-0">
            <p className="break-words text-[18px] font-[650] leading-snug text-text">
              {order.customerName || 'Khách hàng'}
            </p>
            <p className="text-body-sm text-muted">
              {live ? `Đặt lúc ${formatOrderTime(placedAt)}` : formatOrderDate(placedAt)}
            </p>
            <p
              className="truncate font-sign text-body-sm tabular-nums text-muted"
              title={order.orderCode}
            >
              #{order.orderCode}
            </p>
          </div>
          {live ? (
            <span
              className={[
                'inline-flex shrink-0 items-center gap-2xs rounded-full px-sm py-1 text-[14px] font-bold tabular-nums transition-colors duration-200',
                WAIT[urgency],
              ].join(' ')}
              title={`Đã ở bước này ${formatWait(waited)}`}
            >
              <Icon name="timer-outline" size={16} />
              {formatWait(waited)}
            </span>
          ) : showStatus ? (
            <span className="shrink-0">
              <OrderStatusBadge status={order.orderStatus} />
            </span>
          ) : null}
        </header>

        <ul className="flex flex-col gap-xs pb-sm pl-lg pr-sm">
          {shown.map((item) => (
            <li key={item.orderItemId} className="flex gap-sm">
              <span className="w-10 shrink-0 text-right font-sign text-[24px] font-bold leading-[26px] tabular-nums text-text">
                {item.quantity}×
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-[17px] font-medium leading-[26px] text-text">
                  {item.itemName}
                </p>
                {item.note ? (
                  <p className="mt-0.5 w-fit max-w-full break-words rounded-[8px] bg-[#FFF3D1] px-xs py-[2px] text-[15px] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                    Ghi chú: {item.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
          {hidden > 0 ? (
            <li className="pl-[calc(2.5rem+0.75rem)] text-body-md text-muted">+{hidden} món nữa</li>
          ) : null}
        </ul>

        {order.orderStatus === 'REJECTED' && order.rejectionReason ? (
          <p className="mb-sm ml-lg mr-sm break-words rounded-sm bg-error/10 px-sm py-xs text-body-sm text-error">
            Lý do từ chối: {order.rejectionReason}
          </p>
        ) : null}

        {/* Perforation: above is what to make, below is money and the next step. */}
        <div className="mt-auto border-t-2 border-dashed border-border pb-sm pl-lg pr-sm pt-sm">
          <div className="flex items-center justify-between gap-sm">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-sm">
              <Money amountVnd={order.totalAmount} className="!text-[20px]" />
              {order.paymentProvider ? (
                <span className="text-body-sm text-muted">
                  {order.paymentStatus === 'SUCCESS'
                    ? `Đã trả qua ${providerLabel(order.paymentProvider)}`
                    : providerLabel(order.paymentProvider)}
                </span>
              ) : null}
            </div>
            {/* Nothing left to do on a closed order: its one link sits beside the total. */}
            {!primaryAction && secondaryActions ? (
              <div className="flex shrink-0 items-center gap-xs">{secondaryActions}</div>
            ) : null}
          </div>
          {primaryAction ? (
            <div className="mt-sm flex flex-col gap-xs">
              {primaryAction}
              <div className="flex flex-wrap items-center gap-xs">{secondaryActions}</div>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}

/** "5× Bánh mì thịt nướng": what the shown tickets add up to, to cook in batches. */
export function KitchenTally({
  tally,
  orders,
  page,
  totalPages,
}: {
  tally: { itemName: string; quantity: number }[];
  orders: number;
  page: number;
  totalPages: number;
}) {
  return (
    <section
      aria-label="Tổng món cần làm"
      className="flex flex-col gap-xs rounded-[20px] bg-[#FFF3E8] p-md ring-1 ring-brand/15 dark:bg-brand/10"
    >
      <p className="flex items-center gap-xs text-label text-text">
        <Icon name="fire" size={18} color="currentColor" className="text-primary" />
        Bếp cần làm
        <span className="font-normal text-muted">
          trên {orders} đơn đang hiển thị{totalPages > 1 ? ` · trang ${page}/${totalPages}` : ''}
        </span>
      </p>
      <ul className="flex flex-wrap gap-xs">
        {tally.map((line) => (
          <li
            key={line.itemName}
            className="inline-flex items-baseline gap-1.5 rounded-full bg-card px-sm py-1 shadow-card ring-1 ring-border"
          >
            <span className="font-sign text-[18px] font-bold tabular-nums text-primary">
              {line.quantity}×
            </span>
            <span className="text-body-md text-text">{line.itemName}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "1 đơn đã chờ quá 10 phút": said politely, never as a status region (the board has one). */
export function LateOrdersBanner({ count }: { count: number }) {
  return (
    <p
      aria-live="polite"
      className="flex items-center gap-xs rounded-[14px] bg-error/10 px-sm py-xs text-body-lg font-semibold text-error"
    >
      <Icon name="alert-circle-outline" size={20} color="currentColor" />
      {count} đơn đã chờ quá 10 phút
    </p>
  );
}

const HANDOVER: { icon: IconName; text: string }[] = [
  { icon: 'qrcode', text: 'Khách mở mã nhận hàng trên điện thoại' },
  { icon: 'qrcode-scan', text: 'Bạn bấm quét mã của khách' },
  { icon: 'check-circle-outline', text: 'Đơn chuyển sang "Hoàn thành"' },
];

/** How a ready order is handed over: only by scanning the buyer's code. Static. */
export function HandoverGuide() {
  return (
    <section
      aria-label="Cách giao đơn"
      className="flex flex-col gap-sm rounded-[20px] bg-[#E6F6EC] p-md text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]"
    >
      <p className="text-label">Cách giao đơn</p>
      <ol className="grid grid-cols-3 gap-sm">
        {HANDOVER.map((step) => (
          <li key={step.text} className="flex flex-col items-center gap-xs text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-card shadow-card">
              <Icon name={step.icon} size={22} color="currentColor" weight="duotone" />
            </span>
            <span className="text-body-sm leading-snug">{step.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** First load: three paper tickets in grey. */
export function KitchenSkeleton() {
  return (
    <div
      aria-label="Đang tải đơn hàng"
      className="grid gap-md [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          style={TORN_EDGE}
          className="flex h-[232px] flex-col gap-sm rounded-b-[12px] bg-card p-lg ring-1 ring-border"
        >
          <div className="sb-shimmer h-5 w-1/2 rounded-sm" />
          <div className="sb-shimmer h-4 w-1/3 rounded-sm" />
          <div className="sb-shimmer mt-sm h-6 w-3/4 rounded-sm" />
          <div className="sb-shimmer mt-auto h-12 w-full rounded-sm" />
        </div>
      ))}
    </div>
  );
}
