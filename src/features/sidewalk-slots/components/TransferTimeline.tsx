import { Icon } from '@/components/common';
import { TRANSFER_STEP_LABELS, type TransferStepState } from '../my-slots-view';

const DOT: Record<TransferStepState, string> = {
  done: 'bg-tertiary text-white dark:text-[#06140C]',
  current: 'bg-secondary text-on-secondary ring-2 ring-[#6B4100]/40',
  todo: 'bg-card text-muted ring-2 ring-inset ring-border',
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

type Props = {
  steps: TransferStepState[];
  /** Optional date per step (sent, accepted, approved), shown short under its label. */
  dates?: (string | null | undefined)[];
};

/**
 * Sent -> accepted by the receiver -> approved by the ward, as three stations
 * on a rail; the mango station is the one being waited on.
 */
export function TransferTimeline({ steps, dates }: Props) {
  return (
    <ol className="grid grid-cols-3 rounded-[16px] bg-bg px-xs py-sm ring-1 ring-inset ring-border">
      {TRANSFER_STEP_LABELS.map((label, index) => {
        const state = steps[index] ?? 'todo';
        const last = index === TRANSFER_STEP_LABELS.length - 1;
        const date = dates?.[index];
        const validDate = date && !Number.isNaN(Date.parse(date)) ? date : null;
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex flex-col items-center gap-1 px-1"
          >
            {!last && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-4 h-[3px] w-full -translate-y-1/2 rounded-full ${
                  steps[index + 1] === 'todo' ? 'bg-border' : 'bg-tertiary'
                }`}
              />
            )}
            <span
              className={`relative flex h-8 w-8 items-center justify-center rounded-full font-sign text-label font-bold ${DOT[state]}`}
            >
              {state === 'done' ? (
                <Icon name="check" size={18} color="currentColor" />
              ) : state === 'current' ? (
                <Icon name="clock-outline" size={18} color="currentColor" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={`text-center text-body-sm leading-tight ${state === 'todo' ? 'text-muted' : 'font-semibold text-text'}`}
            >
              {label}
            </span>
            {validDate ? (
              <span
                title={new Date(validDate).toLocaleDateString('vi-VN')}
                className="font-tabular text-body-xs text-muted"
              >
                {shortDate(validDate)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
