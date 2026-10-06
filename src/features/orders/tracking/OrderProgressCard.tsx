import { useEffect, useState, type CSSProperties } from 'react';

import { Card, Icon } from '@/components/common';
import { colors } from '@/theme';
import { formatOrderTime } from '../components/order-format';
import type { OrderStatus, OrderStatusHistory, OrderTracking } from '../types/order.types';
import {
  buildTrackingSteps,
  trackingProgress,
  TRACKING_HEADLINES,
  type TrackingStep,
} from './tracking-steps';

/** Re-renders every `intervalMs` while `active`, so "late" appears without a refetch. */
function useNow(active: boolean, intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

/** "10:42 – 10:50", or "khoảng 10:45" when the stall is that consistent. */
function clockWindow(from: string, to: string): string {
  const a = formatOrderTime(from);
  const b = formatOrderTime(to);
  return a === b ? `khoảng ${a}` : `${a} – ${b}`;
}

const minutesRange = (low: number, high: number) =>
  low === high ? `khoảng ${low} phút` : `${low}–${high} phút`;

/** The line under the headline: when it will be ready, or what to do now that it is. */
function estimateText(
  status: OrderStatus,
  tracking: OrderTracking | undefined,
  now: number,
): string | null {
  const estimate = tracking?.readyEstimate;
  if (status === 'READY_FOR_PICKUP') {
    return tracking?.readyAt
      ? `Sẵn sàng từ ${formatOrderTime(tracking.readyAt)} · Đưa mã nhận món cho quán`
      : 'Đưa mã nhận món bên dưới cho quán';
  }
  if (!estimate) return null;
  if (status === 'PLACED') {
    return `Quán thường làm xong trong ${minutesRange(estimate.lowMinutes, estimate.highMinutes)} sau khi nhận đơn`;
  }
  if (estimate.earliestReadyAt && estimate.latestReadyAt) {
    const late = estimate.isLate || now > new Date(estimate.latestReadyAt).getTime();
    return late
      ? 'Đã qua giờ dự kiến một chút, quán đang hoàn tất món'
      : `Dự kiến sẵn sàng ${clockWindow(estimate.earliestReadyAt, estimate.latestReadyAt)}`;
  }
  return null;
}

/** Where the estimate comes from, so a guess never passes for a measurement. */
function basisText(tracking: OrderTracking | undefined): string | null {
  const estimate = tracking?.readyEstimate;
  if (!estimate) return null;
  const queue = tracking.ordersAhead > 0 ? `${tracking.ordersAhead} đơn đang làm trước bạn · ` : '';
  return estimate.basis === 'HISTORY'
    ? `${queue}Theo ${estimate.sampleSize} đơn gần đây của quán`
    : `${queue}Ước tính chung, quán chưa đủ dữ liệu riêng`;
}

/** Ready is good news, so its step is drawn in the "ok" green; every other step in brand chili. */
const toneOf = (step: TrackingStep) =>
  step.status === 'READY_FOR_PICKUP' || step.status === 'COMPLETED' ? 'leaf' : 'chili';

function StepDot({ step }: { step: TrackingStep }) {
  const leaf = toneOf(step) === 'leaf';
  if (step.state === 'done') {
    return (
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full ${leaf ? 'bg-tertiary' : 'bg-primary'}`}
      >
        <Icon name="check" size={16} color={colors.white} />
      </span>
    );
  }
  if (step.state === 'current') {
    return (
      <span
        className={`sb-step-current flex h-8 w-8 items-center justify-center rounded-full border-2 bg-card ${leaf ? 'border-tertiary' : 'border-primary'}`}
        style={leaf ? ({ '--sb-pulse': 'var(--c-tertiary)' } as CSSProperties) : undefined}
      >
        <Icon name={step.icon} size={16} color={leaf ? colors.tertiary : colors.primary} />
      </span>
    );
  }
  if (step.state === 'stopped') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-error/10">
        <Icon name={step.icon} size={16} color={colors.error} />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
      <Icon name={step.icon} size={16} color={colors.muted} />
    </span>
  );
}

const STATE_LABEL: Record<TrackingStep['state'], string> = {
  done: 'đã xong',
  current: 'đang ở bước này',
  upcoming: 'chưa tới',
  stopped: 'đơn dừng tại đây',
};

/**
 * ORD-02: where the order is, what comes next, and when it should be ready. The step row reads
 * left to right like the stall's own workflow; only the current step is accented.
 */
export function OrderProgressCard({
  status,
  history,
  tracking,
}: {
  status: OrderStatus;
  history: readonly OrderStatusHistory[];
  tracking?: OrderTracking;
}) {
  const steps = buildTrackingSteps(status, history);
  const progress = trackingProgress(steps);
  const stopped = steps.some((step) => step.state === 'stopped');
  const finished = status === 'COMPLETED' || stopped;
  const now = useNow(!finished && status !== 'READY_FOR_PICKUP');
  const estimate = estimateText(status, tracking, now);
  const basis = status === 'READY_FOR_PICKUP' ? null : basisText(tracking);
  // The line between the first and last dot centres: half a column in from each edge.
  const inset = `${50 / steps.length}%`;

  return (
    <Card>
      <div key={status} className="sb-fade-in">
        <p className="text-headline-sm text-text">{TRACKING_HEADLINES[status]}</p>
        {estimate ? (
          <p className="mt-2xs flex items-start gap-2xs text-body-sm text-muted">
            <Icon name="timer-outline" size={16} className="mt-px shrink-0" />
            <span>{estimate}</span>
          </p>
        ) : null}
        {basis ? <p className="mt-2xs text-body-xs text-muted">{basis}</p> : null}
      </div>

      <ol
        aria-label="Tiến trình đơn hàng"
        className="relative mt-md grid"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="absolute top-4 h-0.5 -translate-y-1/2 rounded-full bg-border"
          style={{ left: inset, right: inset }}
        />
        <span
          aria-hidden="true"
          className={`absolute top-4 h-0.5 -translate-y-1/2 rounded-full transition-[width] duration-500 ease-out ${stopped ? 'bg-muted/50' : 'bg-primary'}`}
          style={{ left: inset, width: `calc((100% - 2 * ${inset}) * ${progress})` }}
        />
        {steps.map((step) => (
          <li
            key={step.status}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="relative flex min-w-0 flex-col items-center text-center"
          >
            <StepDot step={step} />
            {/* One weight for every label: the ring marks the current step, and bold would
                push a label past its column on a small phone. */}
            <span
              className={[
                'mt-2xs w-full truncate px-[2px] text-body-xs',
                step.state === 'upcoming' ? 'text-muted' : step.state === 'stopped' ? 'text-error' : 'text-text',
              ].join(' ')}
            >
              {step.label}
              <span className="sr-only">, {STATE_LABEL[step.state]}</span>
            </span>
            <span className="h-4 text-body-xs tabular-nums text-muted">
              {step.reachedAt ? formatOrderTime(step.reachedAt) : ''}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
