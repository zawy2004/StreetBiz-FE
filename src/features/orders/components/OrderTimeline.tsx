import { statusLabel } from '@/core/constants/status-labels';
import {
  TERMINAL_ORDER_STATUSES,
  type OrderStatus,
  type OrderStatusHistory,
} from '../types/order.types';
import { formatOrderDate } from './order-format';

type Entry = Pick<OrderStatusHistory, 'toStatus'> &
  Partial<Pick<OrderStatusHistory, 'changedAt' | 'note' | 'historyId'>>;

const isStop = (status: OrderStatus) => status === 'REJECTED' || status === 'CANCELLED';

/**
 * The order's journey, top to bottom: each stage it has passed with its time
 * and any note left on it (a seller's reason for handing over without a code
 * is read here), then the stages still to come drawn hollow. The current
 * stage breathes while the order is still moving.
 */
export function OrderTimeline({
  history,
  upcoming = [],
  current,
}: {
  history: OrderStatusHistory[];
  /** Stages not reached yet, drawn as "Sắp tới". */
  upcoming?: OrderStatus[];
  /** The order's status now; marks the matching stage as the current step. */
  current?: OrderStatus;
}) {
  const live = current ? !TERMINAL_ORDER_STATUSES.has(current) : false;
  // No history yet still shows where the order stands, without a time.
  const passed: Entry[] = history.length || !current ? history : [{ toStatus: current }];
  const total = passed.length + upcoming.length;

  return (
    <ol aria-label="Tiến trình đơn hàng" className="flex flex-col">
      {passed.map((entry, index) => {
        const isLast = index === passed.length - 1;
        const here = isLast && current === entry.toStatus;
        const stop = isStop(entry.toStatus);
        const lineBelow = index < total - 1;
        return (
          <li
            key={entry.historyId ?? `${entry.toStatus}-${entry.changedAt ?? 'now'}-${index}`}
            aria-current={here ? 'step' : undefined}
            className="flex gap-sm"
          >
            <div className="flex w-6 shrink-0 flex-col items-center">
              <span className="relative mt-0.5 flex h-6 w-6 items-center justify-center">
                {here && live ? (
                  <span className="sb-ping absolute inset-0 rounded-full bg-brand/40" />
                ) : null}
                <span
                  key={entry.toStatus}
                  className={[
                    'sb-pop relative rounded-full',
                    here
                      ? stop
                        ? 'h-4 w-4 bg-[#B42318]'
                        : 'h-5 w-5 bg-card ring-[4px] ring-brand'
                      : stop
                        ? 'h-3.5 w-3.5 bg-[#B42318]'
                        : 'h-3.5 w-3.5 bg-brand',
                  ].join(' ')}
                />
              </span>
              {lineBelow ? (
                <span
                  aria-hidden="true"
                  className={`my-1 w-[2px] flex-1 rounded-full ${
                    index < passed.length - 1 ? 'bg-brand/60' : 'bg-border'
                  }`}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-md">
              <div className="flex flex-wrap items-baseline justify-between gap-x-sm">
                <p
                  className={`text-[15px] font-semibold leading-6 ${
                    stop ? 'text-[#8F1717] dark:text-[#FF9A90]' : 'text-text'
                  }`}
                >
                  {statusLabel(entry.toStatus).label}
                </p>
                {entry.changedAt ? (
                  <p className="font-sign text-[13px] tabular-nums text-muted">
                    {formatOrderDate(entry.changedAt)}
                  </p>
                ) : null}
              </div>
              {entry.note ? (
                <p className="relative mt-xs whitespace-pre-line break-words rounded-[14px] rounded-tl-[4px] bg-sunken px-sm py-xs text-body-md text-text">
                  {entry.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
      {upcoming.map((stage, index) => (
        <li key={`upcoming-${stage}`} className="flex gap-sm">
          <div className="flex w-6 shrink-0 flex-col items-center">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-muted/60" />
            </span>
            {index < upcoming.length - 1 ? (
              <span
                aria-hidden="true"
                className="my-1 w-0 flex-1 border-l-2 border-dashed border-border"
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-sm pb-md">
            <p className="text-[15px] font-medium leading-6 text-muted">
              {statusLabel(stage).label}
            </p>
            <p className="text-body-sm text-muted">Sắp tới</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
