import { Card, Money } from '@/components/common';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import type { Order } from '../types/order.types';
import { formatOrderDate } from './order-format';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Perforation } from './OrderShapes';
import { orderItemsSummary, orderStatusHint } from './order-display';

/**
 * C12: one past order as a ticket stub. The body names the stall and the
 * dishes; past the perforation, the stub carries the total and the status.
 * The whole card opens the order (it stays a button holding "Xem chi tiết",
 * as before).
 */
export function OrderCard({
  order,
  onPress,
  actions,
}: {
  order: Order;
  onPress?: () => void;
  actions?: React.ReactNode;
}) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const summary = orderItemsSummary(order);
  const hint = orderStatusHint(order);
  return (
    <Card onPress={actions ? undefined : onPress} padded={false} className="group">
      <div className="flex flex-col sm:flex-row">
        <div className="flex min-w-0 flex-1 items-start gap-sm p-md">
          <FoodImage
            photos={storefrontPhotos(order.storefront)}
            icon="storefront-outline"
            iconSize={24}
            iconColor="rgb(var(--c-primary))"
            className="h-14 w-14 shrink-0 rounded-[14px] ring-1 ring-border"
            placeholderClassName="bg-tint-primary"
            imgClassName="transition-transform duration-200 group-hover:scale-[1.04]"
          />
          <div className="min-w-0 flex-1">
            <p
              className="truncate font-editorial text-[19px] font-semibold leading-6 text-text"
              title={order.storefront.storefrontName}
            >
              {order.storefront.storefrontName}
            </p>
            <p className="truncate text-body-sm text-muted" title={summary}>
              <span className="font-sign font-semibold tracking-[0.02em] text-text/80 [font-stretch:80%]">
                #{order.orderCode}
              </span>
              {summary ? ` · ${summary}` : ''}
            </p>
            <p className="mt-0.5 text-body-xs text-muted">
              {itemCount} món · {formatOrderDate(order.placedAt ?? order.createdAt)}
            </p>
            {hint ? (
              <p className="mt-xs text-body-sm font-semibold text-[#6B4100] dark:text-[#FFD27A]">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
        <Perforation className="sm:hidden" notchClass="bg-bg" />
        <Perforation vertical className="hidden sm:block" notchClass="bg-bg" />
        <div className="flex items-center justify-between gap-sm rounded-b-[20px] bg-[#FFF3E8] px-md py-sm dark:bg-[#2A2420] sm:w-[150px] sm:flex-col sm:items-start sm:justify-center sm:rounded-b-none sm:rounded-r-[20px]">
          <Money amountVnd={order.totalAmount} className="whitespace-nowrap" />
          <div className="shrink-0">
            <OrderStatusBadge status={order.orderStatus} />
          </div>
          {onPress ? (
            <button
              type="button"
              onClick={onPress}
              className="min-h-11 shrink-0 rounded-full px-xs text-label text-primary hover:underline sm:-ml-xs"
            >
              Xem chi tiết
            </button>
          ) : null}
        </div>
      </div>
      {actions ? <div className="px-md pb-md">{actions}</div> : null}
    </Card>
  );
}
