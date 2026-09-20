import { Card, Money } from '@/components/common';
import type { Order } from '../types/order.types';
import { formatOrderDate } from './order-format';
import { OrderStatusBadge } from './OrderStatusBadge';

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
  return (
    <Card onPress={actions ? undefined : onPress}>
      <div className="flex items-start gap-sm">
        {order.storefront.imageUrl ? (
          <img
            src={order.storefront.imageUrl}
            alt=""
            className="h-14 w-14 rounded-sm object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-sm bg-bg text-headline-md text-primary"
          >
            SB
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-xs">
            <div>
              <p className="truncate text-headline-sm text-text">{order.storefront.storefrontName}</p>
              <p className="text-body-sm text-muted">#{order.orderCode}</p>
            </div>
            <OrderStatusBadge status={order.orderStatus} />
          </div>
          <p className="mt-2xs text-body-sm text-muted">
            {itemCount} món · {formatOrderDate(order.placedAt ?? order.createdAt)}
          </p>
          <div className="mt-xs flex items-center justify-between gap-sm">
            <Money amountVnd={order.totalAmount} />
            {onPress ? (
              <button
                type="button"
                onClick={onPress}
                className="min-h-11 px-xs text-label text-primary"
              >
                Xem chi tiết
              </button>
            ) : null}
          </div>
          {actions ? <div className="mt-sm">{actions}</div> : null}
        </div>
      </div>
    </Card>
  );
}
