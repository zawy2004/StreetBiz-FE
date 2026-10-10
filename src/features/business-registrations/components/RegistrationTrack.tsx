import { Icon } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import type { RegistrationStatus } from '@/core/api';
import { registrationTrack, type TrackStep } from '../registration-track';
import { useMounted } from './ui-motion';

type Props = {
  status: RegistrationStatus | string;
  createdAt: string | null | undefined;
  reviewedAt: string | null | undefined;
  /** Larger stops and labels, for the detail cover. */
  size?: 'md' | 'lg';
};

const LINE_TONE = {
  ok: 'bg-tertiary',
  pending: 'bg-brand',
  danger: 'bg-[#8F1717] dark:bg-[#FF9A90]',
  neutral: 'bg-muted',
} as const;

/**
 * The three-stop journey of a registration, like a parcel tracker. The painted
 * line runs out to the stop the file is at once the card has mounted; the
 * current stop breathes slowly. Every stop says its state in words.
 */
export function RegistrationTrack({ status, createdAt, reviewedAt, size = 'md' }: Props) {
  const model = registrationTrack(status, createdAt, reviewedAt);
  const mounted = useMounted();
  const withdrawn = status === 'WITHDRAWN';
  const returned = status === 'MORE_INFORMATION_REQUIRED';
  const node = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  return (
    <div className="relative">
      {/* The rail sits behind the stops, from the centre of the first to the centre of the last. */}
      <div
        aria-hidden="true"
        className={`absolute left-[16.66%] right-[16.66%] ${size === 'lg' ? 'top-[12px]' : 'top-[8px]'} h-1 rounded-full ${
          withdrawn ? 'border-t-[3px] border-dashed border-muted/50 bg-transparent' : 'bg-sunken'
        }`}
      >
        {!withdrawn ? (
          <div
            className={`h-full origin-left rounded-full transition-transform duration-700 [transition-timing-function:var(--ease-out)] ${
              returned ? 'bg-secondary' : LINE_TONE[model.tone]
            }`}
            style={{ transform: `scaleX(${mounted ? model.progress : 0})` }}
          />
        ) : null}
        {returned ? (
          <span className="absolute left-1/4 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFF3D1] text-[#6B4100] ring-2 ring-card dark:bg-[#3A2A08] dark:text-[#FFD27A]">
            <Icon name="arrow-left" size={12} color="currentColor" />
          </span>
        ) : null}
      </div>

      <ol aria-label="Tiến trình hồ sơ" className="relative grid grid-cols-3">
        {model.steps.map((step, i) => {
          const isCurrent = i === model.currentIndex;
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex min-w-0 flex-col items-center gap-1.5 text-center"
            >
              <StopDot step={step} isCurrent={isCurrent} sizeClass={node} />
              <span
                className={
                  isCurrent
                    ? 'flex flex-col items-center gap-0.5'
                    : 'sr-only sm:not-sr-only sm:flex sm:flex-col sm:items-center sm:gap-0.5'
                }
              >
                <span
                  className={`text-label ${isCurrent ? 'text-text' : 'text-muted'} ${size === 'lg' ? 'text-[14px]' : ''}`}
                >
                  {step.label}
                </span>
                {step.note ? <StepNote step={step} /> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StopDot({
  step,
  isCurrent,
  sizeClass,
}: {
  step: TrackStep;
  isCurrent: boolean;
  sizeClass: string;
}) {
  const base = `relative flex ${sizeClass} shrink-0 items-center justify-center rounded-full`;
  switch (step.state) {
    case 'done':
    case 'approved':
      return (
        <span aria-hidden="true" className={`${base} bg-tertiary text-white dark:text-[#06140C]`}>
          <Icon name="check" size={12} color="currentColor" />
        </span>
      );
    case 'rejected':
      return (
        <span
          aria-hidden="true"
          className={`${base} bg-[#8F1717] text-white dark:bg-[#FF9A90] dark:text-[#1A0604]`}
        >
          <Icon name="close" size={12} color="currentColor" />
        </span>
      );
    case 'returned':
      return (
        <span
          aria-hidden="true"
          className={`${base} bg-[#FFF3D1] text-[#6B4100] ring-[3px] ring-secondary dark:bg-[#3A2A08] dark:text-[#FFD27A]`}
        >
          <Icon name="pencil-outline" size={11} color="currentColor" />
        </span>
      );
    case 'current':
      return (
        <span aria-hidden="true" className={`${base} bg-card ring-[3px] ring-brand`}>
          {isCurrent ? (
            <span className="absolute -inset-1.5 animate-pulse rounded-full ring-2 ring-brand/35" />
          ) : null}
          <span className="h-2 w-2 rounded-full bg-brand" />
        </span>
      );
    case 'paused':
    case 'withdrawn':
      return (
        <span
          aria-hidden="true"
          className={`${base} border-2 border-dashed border-muted/60 bg-card`}
        />
      );
    default:
      return <span aria-hidden="true" className={`${base} border-2 border-border bg-card`} />;
  }
}

function StepNote({ step }: { step: TrackStep }) {
  const pill =
    step.state === 'returned'
      ? VERDICT_TONES.pending
      : step.state === 'rejected'
        ? VERDICT_TONES.danger
        : step.state === 'approved'
          ? VERDICT_TONES.ok
          : null;
  if (pill) {
    return (
      <span
        className={`max-w-full truncate rounded-full px-2 py-0.5 text-[12px] font-bold leading-4 ${pill.wash} ${pill.ink}`}
      >
        {step.note}
      </span>
    );
  }
  return (
    <span className="max-w-full truncate text-body-xs font-medium text-muted">{step.note}</span>
  );
}
