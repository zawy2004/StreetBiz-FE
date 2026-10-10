import { Icon } from '@/components/common';
import { statusLabel } from '@/core/constants/status-labels';
import type { OrderStatus } from '../types/order.types';
import { BUYER_STAGES } from './order-display';

/**
 * A ticket being punched stage by stage: passed stages filled orange, the
 * current one ringed, the rest hollow. A payment still waiting shows its one
 * mango stage instead. Punches in once on mount (`sb-pop`, staggered).
 */
export function OrderStepRail({
  status,
  size = 'md',
}: {
  status: OrderStatus;
  size?: 'sm' | 'md';
}) {
  if (status === 'PENDING_PAYMENT') {
    return (
      <ol aria-label="Tiến trình" className="flex items-center gap-xs">
        <li aria-current="step" className="flex items-center gap-xs">
          <span className="sb-pop flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF3D1] text-[#6B4100] ring-2 ring-accent dark:bg-[#3A2A08] dark:text-[#FFD27A]">
            <Icon name="clock-outline" size={15} color="currentColor" weight="fill" />
          </span>
          <span className="text-body-sm font-semibold text-[#6B4100] dark:text-[#FFD27A]">
            {statusLabel('PENDING_PAYMENT').label}
          </span>
        </li>
      </ol>
    );
  }
  const current = BUYER_STAGES.indexOf(status);
  const dot = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';
  return (
    <ol aria-label="Tiến trình" className="flex w-full items-start">
      {BUYER_STAGES.map((stage, index) => {
        const done = current >= 0 && index < current;
        const here = index === current;
        const last = index === BUYER_STAGES.length - 1;
        return (
          <li
            key={stage}
            aria-current={here ? 'step' : undefined}
            className={`relative flex min-w-0 flex-col items-start ${last ? 'flex-none' : 'flex-1'}`}
          >
            <div className="flex w-full items-center">
              <span
                style={{ animationDelay: `${index * 120}ms` }}
                className={[
                  'relative flex shrink-0 items-center justify-center rounded-full',
                  dot,
                  done || here ? 'sb-pop' : '',
                  done
                    ? 'bg-brand text-white'
                    : here
                      ? 'bg-card text-brand ring-[3px] ring-brand'
                      : 'bg-card ring-2 ring-border',
                ].join(' ')}
              >
                {done ? (
                  <Icon name="check" size={size === 'sm' ? 11 : 14} color="currentColor" />
                ) : null}
                {here ? <span className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}
              </span>
              {!last ? (
                <span
                  aria-hidden="true"
                  className={`mx-1 h-[3px] flex-1 rounded-full ${done ? 'bg-brand' : 'bg-border'}`}
                />
              ) : null}
            </div>
            <span
              className={`pr-xs text-body-xs leading-4 ${
                size === 'sm' ? 'sr-only' : 'sr-only sm:not-sr-only sm:mt-1.5 sm:block'
              } ${here ? 'font-semibold text-text' : done ? 'text-text/75' : 'text-muted'}`}
            >
              {statusLabel(stage).label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
