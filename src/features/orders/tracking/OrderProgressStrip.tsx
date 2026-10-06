import type { OrderStatus, OrderStatusHistory } from '../types/order.types';
import { buildTrackingSteps, hasTrackingJourney, TRACKING_HEADLINES } from './tracking-steps';

const SHORT: Partial<Record<OrderStatus, string>> = {
  PLACED: 'Chờ quán nhận',
  ACCEPTED: 'Quán đã nhận',
  PREPARING: 'Đang làm món',
  READY_FOR_PICKUP: 'Sẵn sàng, mời đến lấy',
};

/**
 * The order list's one-line answer to "is it done yet?": five thin segments filled up to where the
 * order is, and what is happening, for orders still in progress. Finished, cancelled and unpaid
 * orders keep their status chip alone: there is no journey left to show.
 */
export function OrderProgressStrip({
  status,
  history,
}: {
  status: OrderStatus;
  history: readonly OrderStatusHistory[];
}) {
  const label = SHORT[status];
  if (!label || !hasTrackingJourney(status)) return null;
  const steps = buildTrackingSteps(status, history);
  const reached = steps.filter((step) => step.state !== 'upcoming').length;
  const ready = status === 'READY_FOR_PICKUP';

  return (
    <div className="mt-xs" aria-label={`${TRACKING_HEADLINES[status]} (bước ${reached}/${steps.length})`} role="img">
      <div className="flex gap-[3px]" aria-hidden="true">
        {steps.map((step) => (
          <span
            key={step.status}
            className={[
              'h-1 flex-1 rounded-full transition-colors duration-300',
              step.state === 'upcoming' ? 'bg-sunken' : ready ? 'bg-tertiary' : 'bg-primary',
            ].join(' ')}
          />
        ))}
      </div>
      <p className={`mt-2xs text-body-xs ${ready ? 'font-semibold text-tertiary' : 'text-muted'}`} aria-hidden="true">
        {label}
      </p>
    </div>
  );
}
