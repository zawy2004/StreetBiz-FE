import { useState } from 'react';

import { Icon, Spinner } from '@/components/common';

type Props = {
  seconds: number;
  isRunning: boolean;
  resending: boolean;
  onPress: () => void;
};

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * "Gửi lại mã" with the cooldown drawn as a ring around a timer glyph that
 * empties second by second. The words stay the button's name; the ring is
 * decoration. When the wait is over the label turns orange and a polite live
 * region says so once (the seconds themselves are never announced).
 */
export function ResendButton({ seconds, isRunning, resending, onPress }: Props) {
  // The longest wait seen so far is the full ring (60s, or the backend's own cooldown).
  const [total, setTotal] = useState(Math.max(seconds, 1));
  if (seconds > total) setTotal(seconds);
  const share = isRunning ? seconds / total : 0;

  return (
    <>
      <button
        type="button"
        disabled={isRunning || resending}
        onClick={onPress}
        className={[
          'inline-flex h-12 w-full items-center justify-center gap-xs rounded-[12px] px-md text-[15px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed',
          isRunning
            ? 'bg-sunken/70 text-muted'
            : 'bg-card text-primary ring-1 ring-inset ring-border hover:bg-tint-primary',
        ].join(' ')}
      >
        <span aria-hidden="true" className="relative flex h-6 w-6 items-center justify-center">
          {resending ? (
            <Spinner size={16} />
          ) : (
            <>
              {isRunning ? (
                <svg viewBox="0 0 24 24" className="absolute inset-0 h-6 w-6 -rotate-90">
                  <circle
                    cx="12"
                    cy="12"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="2.5"
                    className="stroke-border"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="stroke-brand"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - share)}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
              ) : null}
              <Icon
                name={isRunning ? 'timer-outline' : 'send-outline'}
                size={isRunning ? 12 : 18}
                color="currentColor"
              />
            </>
          )}
        </span>
        <span className={`block text-center ${isRunning ? 'font-tabular' : ''}`}>
          {isRunning ? `Gửi lại mã sau ${seconds}s` : 'Gửi lại mã'}
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {isRunning ? '' : 'Đã có thể gửi lại mã'}
      </span>
    </>
  );
}
