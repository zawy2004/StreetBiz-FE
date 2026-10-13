import { useEffect, useState, type ReactNode } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { statusLabel } from '@/core/constants/status-labels';
import type { Order, OrderStatus } from '../../types/order.types';
import { formatOrderTime, formatWait, minutesSince, waitTone } from '../order-format';
import { Perforation } from '../OrderShapes';

/**
 * V40 parts: the kitchen ticket from the order board, blown up and clipped to
 * the counter. Large figures for a seller reading at arm's length in the sun;
 * every status pair here is ≥ 7:1 and always carries words, not colour alone.
 */

const VENDOR_STAGES: OrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COMPLETED',
];

type Plate = { wash: string; ink: string; edge: string };

const PENDING: Plate = {
  wash: 'bg-[#FFF3D1] dark:bg-[#3A2A08]',
  ink: 'text-[#6B4100] dark:text-[#FFD27A]',
  edge: 'bg-secondary',
};
const DONE: Plate = {
  wash: 'bg-[#E6F6EC] dark:bg-[#10301F]',
  ink: 'text-[#0B5D33] dark:text-[#8BE3B0]',
  edge: 'bg-tertiary',
};
const STOPPED: Plate = {
  wash: 'bg-[#FDEBEA] dark:bg-[#3A1414]',
  ink: 'text-[#8F1717] dark:text-[#FF9A90]',
  edge: 'bg-error',
};

function stagePlate(status: OrderStatus): Plate {
  if (status === 'READY_FOR_PICKUP' || status === 'COMPLETED') return DONE;
  if (status === 'REJECTED' || status === 'CANCELLED') return STOPPED;
  if (status === 'PLACED') return { ...PENDING, edge: 'bg-primary' };
  if (status === 'ACCEPTED') return { ...PENDING, edge: 'bg-indigo' };
  return PENDING;
}

/** When the order entered the stage it is in now; placed time if history is silent. */
function enteredStageAt(order: Order): string {
  const entry = [...order.statusHistory]
    .reverse()
    .find((history) => history.toStatus === order.orderStatus);
  return entry?.changedAt ?? order.placedAt ?? order.createdAt;
}

/** The status sign hung on the cart: signage capitals on a pale wash of its tone. */
export function StagePlate({ status }: { status: OrderStatus }) {
  const plate = stagePlate(status);
  return (
    <span
      key={status}
      className={`sb-pop inline-flex h-11 items-center gap-xs rounded-[10px] px-sm font-sign text-[20px] font-extrabold leading-none tracking-[0.02em] [font-stretch:86%] md:text-[22px] ${plate.wash} ${plate.ink}`}
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-current" />
      {statusLabel(status).label.toUpperCase()}
    </span>
  );
}

/** Minutes the order has sat in its stage; re-read every 30s while the tab is visible. */
export function WaitClock({ order }: { order: Order }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  const minutes = minutesSince(enteredStageAt(order), now);
  // Only a new order is urgent by age: once accepted, the buyer has been told.
  const tone = order.orderStatus === 'PLACED' ? waitTone(minutes) : 'calm';
  const toneClass = {
    calm: 'bg-sunken text-text',
    warn: 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]',
    late: 'bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]',
  }[tone];
  return (
    <span
      data-tone={tone}
      className={`inline-flex h-11 items-center gap-1.5 rounded-full px-sm font-sign text-[18px] font-bold tabular-nums transition-colors duration-300 ${toneClass}`}
    >
      <Icon name="timer-outline" size={18} color="currentColor" />
      {formatWait(minutes)}
    </span>
  );
}

/** Five stages, punched as the order moves, with the time each was reached. */
export function StageRail({ order }: { order: Order }) {
  const status = order.orderStatus;
  const current = VENDOR_STAGES.indexOf(status);
  const stopped = current < 0;
  const reachedAt = (stage: OrderStatus) =>
    [...order.statusHistory].reverse().find((entry) => entry.toStatus === stage)?.changedAt;
  return (
    <ol aria-label="Các bước của đơn" className="flex w-full items-start">
      {VENDOR_STAGES.map((stage, index) => {
        const time = reachedAt(stage);
        const done = stopped ? Boolean(time) : index < current;
        const here = index === current;
        const last = index === VENDOR_STAGES.length - 1;
        return (
          <li
            key={stage}
            aria-current={here ? 'step' : undefined}
            className={`flex min-w-0 flex-col ${last ? 'flex-none' : 'flex-1'}`}
          >
            <div className="flex items-center">
              <span
                key={here ? `${stage}-here` : stage}
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  here ? 'sb-pop bg-card ring-[4px] ring-brand' : '',
                  done && !here ? 'bg-brand text-white' : '',
                  !done && !here ? 'bg-card ring-2 ring-border' : '',
                ].join(' ')}
              >
                {done && !here ? <Icon name="check" size={16} color="currentColor" /> : null}
                {here ? <span className="h-3 w-3 rounded-full bg-brand" /> : null}
              </span>
              {!last ? (
                <span
                  aria-hidden="true"
                  className={`mx-1 h-1 flex-1 rounded-full ${done ? 'bg-brand' : 'bg-border'}`}
                />
              ) : null}
            </div>
            <span
              className={`mt-1.5 pr-xs text-body-sm leading-4 ${
                here ? 'font-semibold text-text' : done ? 'text-text/80' : 'text-muted'
              } ${here ? '' : 'sr-only md:not-sr-only'}`}
            >
              {statusLabel(stage).label}
            </span>
            {time ? (
              <span className="font-sign text-[13px] tabular-nums text-muted">
                {formatOrderTime(time)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const NEXT_STEP: Partial<Record<OrderStatus, string>> = {
  PLACED: 'Đơn mới đã thanh toán. Nhận đơn để báo khách.',
  ACCEPTED: 'Bắt tay làm món thì bấm Bắt đầu chuẩn bị.',
  PREPARING: 'Làm xong thì bấm Sẵn sàng lấy món để khách đến lấy.',
  READY_FOR_PICKUP: 'Khách đến quầy: quét mã QR trên máy khách.',
  COMPLETED: 'Đơn đã giao xong.',
  REJECTED: 'Đơn đã từ chối; yêu cầu hoàn tiền được tạo tự động.',
  CANCELLED: 'Đơn đã huỷ.',
};

export function NextStepLine({ status }: { status: OrderStatus }) {
  const sentence = NEXT_STEP[status];
  if (!sentence) return null;
  return (
    <p key={status} className="sb-pop text-[17px] font-semibold leading-7 text-text">
      {sentence}
    </p>
  );
}

/**
 * The kitchen ticket, large: quantity before name in signage figures, the
 * buyer's note on a sticker, a tear line, then the totals.
 */
export function KitchenTicketLarge({
  order,
  totals,
  paid,
}: {
  order: Order;
  totals: ReactNode;
  paid?: string | null;
}) {
  const plate = stagePlate(order.orderStatus);
  return (
    <article
      aria-label="Phiếu bếp"
      className="relative rounded-[24px] bg-card shadow-card ring-1 ring-border"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 rounded-l-[24px] transition-colors duration-300 ${plate.edge}`}
      />
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[#C9CFD6] shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] ring-4 ring-card dark:bg-[#5A6B7A]"
      />
      <ul className="flex flex-col divide-y divide-dashed divide-border px-lg pb-md pt-lg">
        {order.items.map((item) => (
          <li key={item.orderItemId} className="flex items-start gap-md py-sm first:pt-0">
            <span className="w-[3.2ch] shrink-0 font-sign text-[36px] font-extrabold leading-[40px] tabular-nums text-text md:text-[40px] md:leading-[44px]">
              {item.quantity}×
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="break-words text-[18px] font-semibold leading-7 text-text md:text-[20px]">
                {item.itemName}
              </p>
              {item.note ? (
                <p className="mt-xs inline-flex max-w-full rounded-[8px] bg-[#FFF3D1] px-sm py-1 text-[16px] font-semibold leading-6 text-[#6B4100] shadow-[0_1px_0_rgb(107_65_0/0.15)] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                  <span className="break-words">Ghi chú: {item.note}</span>
                </p>
              ) : null}
            </div>
          </li>
        ))}
        {order.items.length === 0 ? (
          <li className="py-sm text-body-md text-muted">Đơn không có món.</li>
        ) : null}
      </ul>
      <Perforation notchClass="bg-bg" />
      <div className="flex flex-col gap-xs px-lg pb-lg pt-md">
        {totals}
        {paid ? (
          <p className="flex items-center gap-1.5 text-[16px] font-semibold text-[#0B5D33] dark:text-[#8BE3B0]">
            <Icon name="check-circle" size={18} color="currentColor" />
            {paid}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** Customer, pickup point and payment as three small facts. */
export function OrderFactsStrip({ facts }: { facts: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-[18px] bg-border ring-1 ring-border sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-0.5 bg-card px-md py-sm">
          <dt className="text-body-sm text-muted">{fact.label}</dt>
          <dd className="text-[16px] font-semibold leading-6 text-text">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Loading: grey plate, five grey dots, three ticket rows. No action bar yet. */
export function VendorOrderSkeleton() {
  return (
    <div aria-label="Đang tải đơn hàng" className="flex flex-col gap-lg">
      <div className="flex gap-sm">
        <Skeleton className="h-11 w-48 rounded-[10px]" />
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>
      <div className="flex gap-lg">
        {[0, 1, 2, 3, 4].map((dot) => (
          <Skeleton key={dot} className="h-8 w-8 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-md rounded-[24px] bg-card p-lg ring-1 ring-border">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-md">
            <Skeleton className="h-10 w-14" />
            <Skeleton className="h-6 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
