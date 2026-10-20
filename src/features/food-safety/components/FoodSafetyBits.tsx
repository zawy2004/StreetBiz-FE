import { Icon } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { FoodSafetyApplication } from '@/core/api/food-safety-api';
import type { DishFoodSafetyStatus } from '@/core/api/seller-store-api';
import { colors } from '@/theme';
import { formatDay } from '../format';
import { stepStates, type StepState } from '../view';

/** Where one dish stands with ATTP, on the vendor's menu. */
export function DishFoodSafetyChip({
  status,
  expiresOn,
}: {
  status: DishFoodSafetyStatus;
  expiresOn?: string | null;
}) {
  switch (status) {
    case 'APPROVED':
      return <StatusChip label={`Đạt ATTP đến ${formatDay(expiresOn)}`} tone="ok" />;
    case 'PENDING':
      return <StatusChip label="Chờ duyệt ATTP" tone="pending" />;
    case 'MISSING':
      return <StatusChip label="Cần giấy ATTP" tone="danger" />;
    default:
      return null;
  }
}

/** "Đạt ATTP" mark buyers see next to a certified dish. */
export function FoodSafetyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-tint-tertiary px-2 py-0.5 text-body-xs font-semibold text-tertiary">
      <Icon name="shield-check-outline" size={14} color={colors.tertiary} />
      Đạt ATTP
    </span>
  );
}

const STEPS = ['Gửi phường', 'Chuyển cục ATTP', 'Có kết quả'] as const;

const STATE_WORDS: Record<StepState, string> = {
  done: 'đã xong',
  current: 'đang chờ',
  failed: 'bị từ chối',
  todo: 'chưa tới',
};

function StepNode({ state, size }: { state: StepState; size: 'sm' | 'md' }) {
  const box = size === 'md' ? 'size-7' : 'size-5';
  const glyph = size === 'md' ? 15 : 11;
  if (state === 'done' || state === 'failed') {
    return (
      <span
        aria-hidden="true"
        className={`flex ${box} shrink-0 items-center justify-center rounded-full text-white dark:text-[#06140C] ${state === 'done' ? 'bg-tertiary' : 'bg-error'}`}
      >
        <Icon name={state === 'done' ? 'check' : 'close'} size={glyph} color="currentColor" />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span
        aria-hidden="true"
        className={`relative flex ${box} shrink-0 items-center justify-center rounded-full border-[2.5px] border-brand bg-card`}
      >
        <span className="absolute inset-0 rounded-full bg-brand/30 sb-ping" />
        <span className="relative size-2 rounded-full bg-brand" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} shrink-0 rounded-full border-2 border-border bg-card`}
    />
  );
}

/**
 * The three hops of an ATTP file: vendor → ward → department → result back to
 * the vendor, drawn as stations on a line. The step it waits at pulses; a
 * refusal is marked in red where it happened. `showDates` adds the day each
 * step was reached (vendor's file list).
 */
export function FoodSafetySteps({
  application,
  showDates = false,
  size = 'sm',
}: {
  application: FoodSafetyApplication;
  showDates?: boolean;
  size?: 'sm' | 'md';
}) {
  const states = stepStates(application);
  const dates = [application.submittedAt, application.forwardedAt, application.resultRecordedAt];
  return (
    <ol className="flex w-full items-start" aria-label="Tiến trình hồ sơ ATTP">
      {STEPS.map((label, index) => {
        const state = states[index]!;
        const next = states[index + 1];
        const last = index === STEPS.length - 1;
        return (
          <li key={label} className={`flex min-w-0 flex-col gap-1 ${last ? 'shrink-0' : 'flex-1'}`}>
            <div className="flex items-center">
              <StepNode state={state} size={size} />
              {!last ? (
                <span
                  aria-hidden="true"
                  className={[
                    'mx-1 h-1 flex-1 rounded-full',
                    next === 'done' || next === 'failed'
                      ? 'bg-tertiary'
                      : next === 'current'
                        ? 'bg-[repeating-linear-gradient(90deg,rgb(var(--c-brand))_0_6px,transparent_6px_10px)]'
                        : 'bg-border',
                  ].join(' ')}
                />
              ) : null}
            </div>
            <span
              className={[
                'whitespace-nowrap pr-xs',
                size === 'md' ? 'text-body-sm' : 'text-body-xs',
                state === 'failed'
                  ? 'font-semibold text-error'
                  : state === 'todo'
                    ? 'text-muted'
                    : 'font-semibold text-text',
              ].join(' ')}
            >
              {label}
              <span className="sr-only">: {STATE_WORDS[state]}</span>
            </span>
            {showDates && dates[index] && state !== 'todo' ? (
              <span className="text-body-xs tabular-nums text-muted">
                {formatDay(dates[index])}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
