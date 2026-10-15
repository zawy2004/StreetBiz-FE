import { Button, Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { useAcknowledgeArrival } from '../hooks/useOrderTracking';
import type { OrderArrival } from '../types/order.types';
import { formatOrderTime } from './order-format';

/**
 * A customer on the way to collect, on the seller's ticket. "Đã thấy" tells them the stall read it,
 * so they do not wonder whether to call; once answered it turns into a quiet confirmation.
 */
export function ArrivalBanner({ arrival, className = '' }: { arrival: OrderArrival; className?: string }) {
  const seen = useAcknowledgeArrival();
  const acknowledgedAt = seen.data?.acknowledgedAt ?? arrival.acknowledgedAt ?? null;
  return (
    <div
      className={`flex items-start justify-between gap-sm rounded-sm bg-tint-tertiary px-sm py-xs text-body-sm text-text ${className}`}
    >
      <p className="flex items-start gap-xs">
        <Icon name="walk" size={16} className="mt-px shrink-0" />
        <span>
          <strong className="font-semibold">Khách đang đến</strong> · báo lúc {formatOrderTime(arrival.notifiedAt)}.{' '}
          {arrival.message}
        </span>
      </p>
      {acknowledgedAt ? (
        <span className="flex shrink-0 items-center gap-2xs text-muted">
          <Icon name="check-circle-outline" size={16} />
          Đã thấy
        </span>
      ) : (
        <Button
          label="Đã thấy"
          size="sm"
          variant="outline"
          fullWidth={false}
          loading={seen.isPending}
          onPress={() =>
            seen.mutate(arrival.orderId, {
              onError: (error) => showToast(errorMessage(error)),
            })
          }
        />
      )}
    </div>
  );
}
