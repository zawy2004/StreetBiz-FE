import { Icon } from '@/components/common';
import { TRANSFER_STEP_LABELS, type TransferStepState } from '../my-slots-view';

const CIRCLE: Record<TransferStepState, string> = {
  done: 'bg-tertiary text-white dark:text-[#06140C]',
  current: 'bg-secondary text-on-secondary',
  todo: 'bg-border text-muted',
};

/** Sent -> accepted by the receiver -> approved by the ward; the amber step is the one being waited on. */
export function TransferTimeline({ steps }: { steps: TransferStepState[] }) {
  return (
    <ol className="flex rounded-sm bg-bg px-sm py-sm">
      {TRANSFER_STEP_LABELS.map((label, index) => {
        const state = steps[index] ?? 'todo';
        const last = index === TRANSFER_STEP_LABELS.length - 1;
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined} className="relative flex flex-1 flex-col items-center gap-1">
            {!last && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${steps[index + 1] === 'todo' ? 'bg-border' : 'bg-tertiary'}`}
              />
            )}
            <span className={`relative flex h-8 w-8 items-center justify-center rounded-full text-label ${CIRCLE[state]}`}>
              {state === 'done' ? (
                <Icon name="check" size={18} />
              ) : state === 'current' ? (
                <Icon name="clock-outline" size={18} />
              ) : (
                index + 1
              )}
            </span>
            <span className={`text-center text-body-sm ${state === 'todo' ? 'text-muted' : 'font-semibold text-text'}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
