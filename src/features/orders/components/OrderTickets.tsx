import { useId, type ReactNode } from 'react';

import { Button, Money } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { statusLabel } from '@/core/constants/status-labels';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import type { Order } from '../types/order.types';
import { formatOrderDate } from './order-format';
import { OrderStatusBadge } from './OrderStatusBadge';
import { IllustrativeTag } from './OrderShapes';
import { orderItemsSummary, orderStatusHint } from './order-display';
import { OrderStepRail } from './OrderStepRail';

/**
 * C12: the order still on its way, laid out large on top of the list: the
 * stall's photo, its name, the dishes, and the ticket being punched stage by
 * stage. The whole ticket opens the order ("Xem chi tiết" is stretched over
 * it); an unpaid order also offers to carry on paying.
 */
export function ActiveOrderTicket({
  order,
  onOpen,
  onContinuePayment,
}: {
  order: Order;
  onOpen: () => void;
  onContinuePayment?: () => void;
}) {
  const titleId = useId();
  const photos = storefrontPhotos(order.storefront);
  const summary = orderItemsSummary(order);
  const hint = orderStatusHint(order);
  return (
    <article
      aria-labelledby={titleId}
      className="sb-rise group relative overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border md:grid md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-1.5 bg-brand" />
      <div className="relative aspect-[16/9] md:aspect-auto md:h-full md:min-h-[240px]">
        <FoodImage
          photos={photos}
          icon="storefront-outline"
          iconSize={44}
          iconColor="rgb(var(--c-primary))"
          className="h-full w-full"
          placeholderClassName="bg-tint-primary"
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {photos[0]?.illustrative ? (
          <IllustrativeTag className="absolute bottom-sm right-sm" />
        ) : null}
        <span className="absolute left-md top-md rounded-full bg-card/90 px-sm py-1 text-body-xs font-semibold text-text shadow-card backdrop-blur">
          Đơn đang diễn ra
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-sm p-md md:p-lg">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <h2
            id={titleId}
            className="min-w-0 font-editorial text-[24px] font-semibold leading-[1.15] tracking-[-0.01em] text-text md:text-[28px] lg:text-[32px]"
          >
            {order.storefront.storefrontName}
          </h2>
          <OrderStatusBadge status={order.orderStatus} />
        </div>
        <p className="line-clamp-2 text-body-md text-muted" title={summary}>
          <span className="font-sign font-semibold tracking-[0.02em] text-text [font-stretch:80%]">
            #{order.orderCode}
          </span>
          {summary ? ` · ${summary}` : ''}
        </p>
        <div className="mt-xs rounded-[16px] bg-sunken/60 px-sm py-sm">
          <OrderStepRail status={order.orderStatus} />
          <p className="mt-xs text-body-sm font-semibold text-text sm:hidden">
            {statusLabel(order.orderStatus).label}
          </p>
        </div>
        {hint ? (
          <p className="text-body-sm font-semibold text-[#6B4100] dark:text-[#FFD27A]">{hint}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-sm pt-xs">
          <div>
            <Money amountVnd={order.totalAmount} className="!text-[22px] !leading-7" />
            <p className="text-body-xs text-muted">
              {formatOrderDate(order.placedAt ?? order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-xs">
            {onContinuePayment ? (
              <div className="relative z-20">
                <Button label="Tiếp tục thanh toán" fullWidth={false} onPress={onContinuePayment} />
              </div>
            ) : null}
            <button
              type="button"
              onClick={onOpen}
              aria-describedby={titleId}
              className="min-h-11 rounded-full px-sm text-label text-primary after:absolute after:inset-0 after:z-10 after:rounded-[28px] after:content-[''] hover:underline focus-visible:after:ring-4 focus-visible:after:ring-primary/30"
            >
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** "Hôm nay · 2 đơn": a small sign with an orange rule, one per day of the page. */
export function OrderDayHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-xs border-l-[3px] border-brand pl-sm font-sign text-[13px] font-semibold uppercase tracking-[0.06em] text-text">
      {children}
    </h2>
  );
}

/** Loading: one large ticket and four stubs, in their real shapes. */
export function OrderTicketSkeleton() {
  return (
    <div aria-label="Đang tải đơn hàng" className="flex flex-col gap-lg">
      <div className="overflow-hidden rounded-[28px] bg-card ring-1 ring-border md:grid md:grid-cols-[280px_1fr]">
        <Skeleton className="aspect-[16/9] w-full rounded-none md:aspect-auto md:h-[240px]" />
        <div className="flex flex-col gap-sm p-lg">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-sm h-10 w-full rounded-[16px]" />
          <Skeleton className="h-6 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-4 w-28" />
      <div className="grid gap-md lg:grid-cols-2">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center gap-sm rounded-[20px] bg-card p-md ring-1 ring-border"
          >
            <Skeleton className="h-14 w-14 rounded-[14px]" />
            <div className="flex flex-1 flex-col gap-xs">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
