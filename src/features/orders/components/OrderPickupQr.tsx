import { useQuery } from '@tanstack/react-query';

import { Card, QrCode } from '@/components/common';
import { errorMessage } from '@/core/api';
import { orderApi } from '../api/orderApi';
import { COLLECTABLE_ORDER_STATUSES, type Order } from '../types/order.types';

/**
 * ORD-06: the buyer's proof of collection. The seller scans this instead of
 * taking their word for it, so it only appears while the order is paid and still
 * waiting to be handed over.
 */
export function OrderPickupQr({ order }: { order: Order }) {
  const collectable = COLLECTABLE_ORDER_STATUSES.has(order.orderStatus);
  const code = useQuery({
    queryKey: ['orders', 'pickup-code', String(order.orderId)],
    queryFn: () => orderApi.pickupCode(order.orderId),
    enabled: collectable,
    staleTime: Infinity, // the code never changes for an order
  });

  if (!collectable) return null;

  return (
    <Card>
      <div className="flex flex-col items-center gap-sm">
        <p className="text-headline-sm text-text">Mã nhận hàng</p>
        {code.isPending ? (
          <p className="text-body-md text-muted">Đang tạo mã…</p>
        ) : code.isError ? (
          <p className="text-body-md text-error">{errorMessage(code.error)}</p>
        ) : (
          <>
            <QrCode value={code.data.token} />
            <p className="text-center text-body-md text-muted">
              Đưa mã này cho quán quét khi nhận hàng.
            </p>
            <p className="text-body-sm text-muted">
              Đơn {code.data.orderCode}
              {order.orderStatus === 'READY_FOR_PICKUP' ? ' · Đơn đã sẵn sàng' : ''}
            </p>
            {/* Cameras break and phones run out of battery, so the same proof is
                printed in a form the seller can type. */}
            <div className="w-full border-t border-border pt-sm text-center">
              <p className="text-body-sm text-muted">Quán không quét được? Đọc mã này:</p>
              <p className="mt-2xs select-all font-mono text-display-sm tracking-[0.2em] text-text">
                {code.data.shortCode}
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
