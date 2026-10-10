import type { ReactNode } from 'react';

import { Money } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import type { StatusTone } from '@/theme';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import type { Order, OrderStatus } from '../types/order.types';
import { SCALLOP_BOTTOM } from './order-display';

/**
 * C13 parts: the order read as a receipt with its pickup stub, a journey of
 * stages, and what to do next. Display only.
 */

const NEXT_STEP: Partial<Record<OrderStatus, string>> = {
  PLACED: 'Đang chờ quán nhận đơn. Bạn vẫn huỷ được cho tới khi quán nhận.',
  ACCEPTED: 'Quán đã nhận đơn và sắp bắt đầu làm món.',
  PREPARING: 'Quán đang làm món của bạn.',
  READY_FOR_PICKUP: 'Món đã xong. Đến quầy và đưa mã nhận hàng.',
  COMPLETED: 'Đơn đã giao. Chúc bạn ngon miệng!',
  REJECTED: 'Quán đã từ chối đơn.',
  CANCELLED: 'Đơn đã huỷ.',
};

/** The one sentence at the top of the order: where it stands and what comes next. */
export function OrderNextStep({ status, aside }: { status: OrderStatus; aside?: ReactNode }) {
  const sentence = NEXT_STEP[status];
  if (!sentence) return null;
  const ready = status === 'READY_FOR_PICKUP';
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-sm ${
        ready
          ? '-mx-md rounded-none bg-[#E6F6EC] px-md py-md dark:bg-[#10301F] md:mx-0 md:rounded-[20px] md:px-lg'
          : ''
      }`}
    >
      <p
        key={status}
        className={`sb-pop min-w-0 flex-1 font-editorial text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] md:text-[28px] lg:text-[32px] ${
          ready ? 'text-[#0B5D33] dark:text-[#8BE3B0]' : 'text-text'
        }`}
      >
        {sentence}
      </p>
      {aside}
    </div>
  );
}

/** The refund as its own panel, on a wash of its tone. */
export function RefundPanel({
  label,
  tone,
  message,
  amount,
  requestedAt,
}: {
  label: string;
  tone: StatusTone;
  message: string;
  amount?: number | null;
  requestedAt?: string | null;
}) {
  const verdict = VERDICT_TONES[tone];
  return (
    <section aria-label="Hoàn tiền" className={`rounded-[20px] p-md md:p-lg ${verdict.wash}`}>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <p className={`text-label ${verdict.ink}`}>Hoàn tiền</p>
        <StatusChip label={label} tone={tone} />
      </div>
      {amount != null ? <Money amountVnd={amount} size="lg" className="mt-xs block" /> : null}
      <p className={`mt-xs text-body-md font-medium ${verdict.ink}`}>{message}</p>
      {requestedAt ? (
        <p className="mt-2xs text-body-sm text-text/70">
          Yêu cầu lúc {new Date(requestedAt).toLocaleString('vi-VN')}
        </p>
      ) : null}
    </section>
  );
}

/** "HOÀN TIỀN ★ STREETBIZ": a green stamp pressed onto the receipt total, once. */
export function RefundStamp({ className = '' }: { className?: string }) {
  const tone = VERDICT_TONES.ok;
  return (
    <PermitStamp
      icon="cash-multiple"
      inkClass={tone.ink}
      strokeClass={tone.stroke}
      ringText="HOÀN TIỀN ★ STREETBIZ ★ HOÀN TIỀN ★"
      className={className}
    />
  );
}

/**
 * The thermal-printer receipt: the stall at its head, then whatever the
 * screen prints on it, and a bitten bottom edge.
 */
export function OrderReceipt({
  order,
  attached,
  children,
}: {
  order: Order;
  /** A pickup stub sits right above, so the head is squared off to join it. */
  attached?: boolean;
  children: ReactNode;
}) {
  const photos = storefrontPhotos(order.storefront);
  return (
    <div className="drop-shadow-[0_22px_30px_rgb(17_28_43/0.12)] dark:drop-shadow-none">
      <article
        aria-label="Biên nhận"
        style={SCALLOP_BOTTOM}
        className={`relative flex flex-col gap-md rounded-t-[28px] bg-card px-md pb-xl pt-md ring-1 ring-border md:px-lg ${
          attached ? 'lg:rounded-t-none' : ''
        }`}
      >
        <header className="flex items-center gap-sm">
          <span title={photos[0]?.illustrative ? 'Ảnh minh họa' : undefined}>
            <FoodImage
              photos={photos}
              icon="storefront-outline"
              iconSize={22}
              iconColor="rgb(var(--c-primary))"
              className="h-12 w-12 shrink-0 rounded-full ring-2 ring-card"
              placeholderClassName="bg-tint-primary"
            />
          </span>
          <div className="min-w-0">
            <p className="font-editorial text-[22px] font-semibold leading-7 text-text">
              {order.storefront.storefrontName}
            </p>
            {order.storefront.address ? (
              <p className="text-body-sm text-muted">{order.storefront.address}</p>
            ) : null}
            <p className="text-body-sm text-muted">Nhận trực tiếp tại điểm bán</p>
          </div>
        </header>
        {children}
      </article>
    </div>
  );
}

/** Loading: the sentence, the stub, the receipt lines and the journey dots. */
export function OrderDetailSkeleton() {
  return (
    <div aria-label="Đang tải đơn hàng" className="flex flex-col gap-lg">
      <Skeleton className="h-9 w-3/4" />
      <div className="flex gap-xs">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="grid gap-lg lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-md rounded-[28px] bg-card p-lg ring-1 ring-border">
          <Skeleton className="h-[220px] w-[220px] rounded-[16px]" />
          <Skeleton className="h-4 w-2/3" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-4 w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-md rounded-[20px] bg-card p-lg ring-1 ring-border">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-sm">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
