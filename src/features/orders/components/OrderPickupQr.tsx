import { useQuery } from '@tanstack/react-query';

import { Icon, QrCode } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { orderApi } from '../api/orderApi';
import { COLLECTABLE_ORDER_STATUSES, type Order } from '../types/order.types';
import { Perforation } from './OrderShapes';

/**
 * ORD-06: the buyer's proof of collection. The seller scans this instead of
 * taking their word for it, so it only appears while the order is paid and still
 * waiting to be handed over.
 *
 * Drawn as the stub at the head of the receipt: pure white behind the QR, the
 * 8-character code large enough to read out across a counter, and a tear line
 * below. Centred, because it is held up for the stall to read.
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
  const ready = order.orderStatus === 'READY_FOR_PICKUP';

  return (
    <section
      key={ready ? 'ready' : 'waiting'}
      aria-label="Cuống nhận hàng"
      className={`relative rounded-t-[28px] bg-card shadow-card ring-1 ring-border lg:shadow-none ${
        ready ? 'sb-pop' : ''
      }`}
    >
      <div className="flex flex-col items-center gap-sm px-md pb-lg pt-lg text-center md:px-lg">
        <p className="font-sign text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">
          Mã nhận hàng
        </p>
        {code.isPending ? (
          <>
            <Skeleton className="h-[252px] w-[252px] rounded-[16px]" />
            <p className="text-body-md text-muted">Đang tạo mã…</p>
          </>
        ) : code.isError ? (
          <p className="w-full rounded-[16px] bg-[#FDEBEA] px-md py-lg text-body-md text-error ring-1 ring-[#B42318]/25 dark:bg-[#3A1414]">
            {errorMessage(code.error)}
          </p>
        ) : (
          <>
            <div
              role="img"
              aria-label="Mã QR nhận hàng"
              className="rounded-[20px] bg-white p-1 ring-1 ring-[#E1E5EA]"
            >
              <QrCode value={code.data.token} size={220} />
            </div>
            <p className="max-w-[32ch] text-body-md text-text">
              Đưa mã này cho quán quét khi nhận hàng.
            </p>
            <p className="text-body-sm font-semibold text-muted">
              Đơn {code.data.orderCode}
              {ready ? ' · Đơn đã sẵn sàng' : ''}
            </p>
            {/* Cameras break and phones run out of battery, so the same proof is
                printed in a form the seller can type. */}
            <div className="mt-xs w-full rounded-[16px] bg-sunken/70 px-sm py-sm">
              <p className="text-body-sm text-muted">Quán không quét được? Đọc mã này:</p>
              <p
                tabIndex={0}
                className="mt-2xs select-all rounded-[8px] font-sign text-[28px] font-extrabold leading-10 tracking-[0.2em] text-text tabular-nums focus-visible:ring-4 focus-visible:ring-primary/30 sm:text-[32px]"
              >
                {code.data.shortCode}
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-body-xs text-muted">
              <Icon name="white-balance-sunny" size={15} color="currentColor" />
              Tăng độ sáng màn hình nếu quán quét chưa được.
            </p>
          </>
        )}
      </div>
      <Perforation notchClass="bg-bg" />
    </section>
  );
}
