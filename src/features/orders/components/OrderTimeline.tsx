import type { OrderStatusHistory } from '../types/order.types';
import { formatOrderDate } from './order-format';
import { OrderStatusBadge } from './OrderStatusBadge';

export function OrderTimeline({ history }: { history: OrderStatusHistory[] }) {
  return (
    <ol aria-label="Tiến trình đơn hàng" className="flex flex-col gap-sm">
      {history.map((entry, index) => (
        <li
          key={entry.historyId ?? `${entry.toStatus}-${entry.changedAt}-${index}`}
          className="flex gap-sm"
        >
          <div className="flex flex-col items-center">
            <span className="mt-1 h-3 w-3 rounded-full bg-primary" />
            {index < history.length - 1 ? <span className="h-full w-px bg-border" /> : null}
          </div>
          <div className="min-w-0 pb-sm">
            <OrderStatusBadge status={entry.toStatus} />
            <p className="mt-2xs text-body-sm text-muted">{formatOrderDate(entry.changedAt)}</p>
            {entry.note ? <p className="mt-2xs text-body-sm text-text">{entry.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
