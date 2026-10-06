import type { ReactNode } from 'react';

import { Icon, Money } from '@/components/common';
import type { Order, OrderArrival } from '../types/order.types';
import {
  formatOrderDate,
  formatOrderTime,
  formatWait,
  minutesSince,
  ticketItemsShown,
  waitTone,
} from './order-format';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { StageTone } from './OrderPipeline';

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

/** When the order entered the stage it is in now; placed time if history is silent. */
function enteredStageAt(order: Order): string {
  const entry = [...order.statusHistory]
    .reverse()
    .find((history) => history.toStatus === order.orderStatus);
  return entry?.changedAt ?? order.placedAt ?? order.createdAt;
}

/**
 * ORD-04: an order as a seller works it - a kitchen ticket. What to make comes
 * first, quantity before name, with the buyer's notes where the cook reads
 * them; who it is for and how long it has waited sit above; what to do next
 * sits below.
 *
 * `live` tickets (orders still being worked) show how long they have sat in
 * their stage. History tickets show their date, and their status only where
 * the list mixes statuses (`showStatus`).
 */
export function VendorOrderTicket({
  order,
  tone,
  live,
  showStatus = false,
  now,
  primaryAction,
  secondaryActions,
  arrival,
}: {
  order: Order;
  tone: StageTone;
  live: boolean;
  showStatus?: boolean;
  now: number;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  /** The customer said they are on the way ("Tôi đang đến"): time to finish their food. */
  arrival?: OrderArrival;
}) {
  const waited = minutesSince(enteredStageAt(order), now);
  // Only a new order is urgent by age: once accepted, the buyer has been told.
  const urgency = order.orderStatus === 'PLACED' ? waitTone(waited) : 'calm';
  const shown = order.items.slice(0, ticketItemsShown(order.items.length));
  const hidden = order.items.length - shown.length;
  const placedAt = order.placedAt ?? order.createdAt;

  return (
    <article
      aria-label={`Đơn ${order.orderCode}`}
      className="relative flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-card"
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${EDGE[tone]}`} />

      <header className="flex items-start justify-between gap-sm py-sm pl-md pr-sm">
        <div className="min-w-0">
          <p className="truncate text-headline-md text-text">
            {order.customerName || 'Khách hàng'}
          </p>
          <p className="text-body-sm text-muted">
            {live ? `Đặt lúc ${formatOrderTime(placedAt)}` : formatOrderDate(placedAt)}
          </p>
          <p className="truncate text-body-xs text-muted" title={order.orderCode}>
            #{order.orderCode}
          </p>
        </div>
        {live ? (
          <span
            className={[
              'inline-flex shrink-0 items-center gap-2xs rounded-full px-xs py-2xs text-badge tabular-nums',
              WAIT[urgency],
            ].join(' ')}
            title={`Đã ở bước này ${formatWait(waited)}`}
          >
            <Icon name="timer-outline" size={14} />
            {formatWait(waited)}
          </span>
        ) : showStatus ? (
          <span className="shrink-0">
            <OrderStatusBadge status={order.orderStatus} />
          </span>
        ) : null}
      </header>

      {live && arrival ? (
        <p className="mx-md mb-sm flex items-start gap-xs rounded-sm bg-tint-tertiary px-sm py-xs text-body-sm text-text">
          <Icon name="walk" size={16} className="mt-px shrink-0" />
          <span>
            <strong className="font-semibold">Khách đang đến</strong> · báo lúc{' '}
            {formatOrderTime(arrival.notifiedAt)}. {arrival.message}
          </span>
        </p>
      ) : null}

      <ul className="flex flex-col gap-2xs pb-sm pl-md pr-sm">
        {shown.map((item) => (
          <li key={item.orderItemId} className="flex gap-sm">
            <span className="w-8 shrink-0 text-right text-headline-sm tabular-nums text-text">
              {item.quantity}×
            </span>
            <div className="min-w-0">
              <p className="text-body-lg text-text">{item.itemName}</p>
              {item.note ? (
                <p className="text-body-sm text-on-secondary">Ghi chú: {item.note}</p>
              ) : null}
            </div>
          </li>
        ))}
        {hidden > 0 ? (
          <li className="pl-[calc(2rem+0.75rem)] text-body-sm text-muted">+{hidden} món nữa</li>
        ) : null}
      </ul>

      {order.orderStatus === 'REJECTED' && order.rejectionReason ? (
        <p className="mx-md mb-sm rounded-sm bg-error/10 px-sm py-xs text-body-sm text-error">
          Lý do từ chối: {order.rejectionReason}
        </p>
      ) : null}

      {/* Perforation: above is what to make, below is money and the next step. */}
      <div className="mt-auto border-t border-dashed border-border py-sm pl-md pr-sm">
        <div className="flex items-center justify-between gap-sm">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-sm">
            <Money amountVnd={order.totalAmount} />
            {order.paymentProvider ? (
              <span className="text-body-sm text-muted">
                {order.paymentStatus === 'SUCCESS'
                  ? `Đã trả qua ${order.paymentProvider}`
                  : order.paymentProvider}
              </span>
            ) : null}
          </div>
          {/* Nothing left to do on a closed order: its one link sits beside the
              total instead of taking a row of its own. */}
          {!primaryAction && secondaryActions ? (
            <div className="flex shrink-0 items-center gap-xs">{secondaryActions}</div>
          ) : null}
        </div>
        {primaryAction ? (
          <div className="mt-sm flex flex-wrap items-center gap-xs">
            <div className="min-w-0 flex-1">{primaryAction}</div>
            {secondaryActions}
          </div>
        ) : null}
      </div>
    </article>
  );
}
