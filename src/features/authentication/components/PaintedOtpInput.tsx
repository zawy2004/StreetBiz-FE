import { createRef, useEffect, useMemo, useRef } from 'react';

import { playOnce } from './paint-in';

type Props = {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
  /** Paint the boxes in the error ink (an error message is shown by the screen). */
  invalid?: boolean;
};

/**
 * The OTP boxes as six pavement slots waiting for paint: an empty slot is a
 * dashed kerb-orange outline, the slot being typed in is solid, and a slot
 * with its digit gets a painted bar along its foot. When all six are in, the
 * bars light up left to right.
 *
 * Input handling is the same as the shared `OtpInput` (six real inputs, digits
 * only, auto-advance, Backspace steps back, paste fills from the box pasted
 * into); only the look differs, so the A03 screen can have its own slots.
 */
export function PaintedOtpInput({ length = 6, value, onChangeText, invalid }: Props) {
  const refs = useMemo(() => Array.from({ length }, () => createRef<HTMLInputElement>()), [length]);
  const groupRef = useRef<HTMLDivElement>(null);
  const previous = useRef(value);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const complete = digits.every(Boolean);

  const setDigit = (index: number, digit: string) => {
    const clean = digit.replace(/[^0-9]/g, '').slice(-1);
    const next = digits.slice();
    next[index] = clean;
    onChangeText(next.join(''));
    if (clean && index < length - 1) {
      refs[index + 1]?.current?.focus();
    }
  };

  /** Lets the user paste the whole code into any box. */
  const handlePaste = (index: number, text: string) => {
    const pasted = text.replace(/\D/g, '').slice(0, length - index);
    if (!pasted) return;
    const next = digits.slice();
    for (let i = 0; i < pasted.length; i += 1) next[index + i] = pasted[i]!;
    onChangeText(next.join(''));
    refs[Math.min(index + pasted.length, length - 1)]?.current?.focus();
  };

  // A box that just received a digit gives a small press.
  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    for (let i = 0; i < length; i += 1) {
      if (value[i] && value[i] !== before[i]) {
        playOnce(refs[i]?.current, [{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], {
          duration: 120,
          easing: 'ease-out',
        });
      }
    }
  }, [value, length, refs]);

  // A rejected code: the row shakes once, like a sign knocked on its post.
  useEffect(() => {
    if (!invalid) return;
    playOnce(
      groupRef.current,
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 240, easing: 'ease-in-out' },
    );
  }, [invalid]);

  return (
    <div
      ref={groupRef}
      className="flex justify-start gap-1.5 min-[360px]:gap-2 sm:gap-2.5"
      role="group"
      aria-label="Mã xác thực 6 số"
    >
      {digits.map((digit, index) => (
        <span key={index} className="relative">
          <input
            ref={refs[index]}
            value={digit}
            onChange={(e) => setDigit(index, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              handlePaste(index, e.clipboardData.getData('text'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digit && index > 0) {
                refs[index - 1]?.current?.focus();
              }
            }}
            aria-label={`Số thứ ${index + 1}`}
            aria-invalid={invalid ? true : undefined}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            inputMode="numeric"
            maxLength={1}
            data-filled={digit ? '' : undefined}
            className={[
              'block h-[54px] w-[42px] rounded-[10px] text-center font-sign text-[28px] font-semibold leading-none text-text outline-none transition-[border-color,box-shadow,background-color] duration-150 font-tabular min-[360px]:h-[58px] min-[360px]:w-[46px] min-[360px]:text-[32px] sm:h-16 sm:w-[52px]',
              'focus:border-2 focus:border-solid focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_rgb(var(--c-primary)/0.16)]',
              invalid
                ? 'border-2 border-solid border-error bg-error-bg/60'
                : digit
                  ? 'border border-solid border-border bg-card shadow-card'
                  : 'border-2 border-dashed border-brand/55 bg-[#FFF8F2] dark:bg-sunken',
            ].join(' ')}
          />
          {/* The painted bar under a filled slot; all six light up in a row once complete. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[6px] bottom-[3px] h-1 origin-left rounded-full bg-brand"
            style={{
              transform: `scaleX(${digit ? 1 : 0})`,
              opacity: invalid ? 0 : complete ? 1 : 0.75,
              transition: `transform 200ms var(--ease-out) ${complete ? index * 40 : 0}ms, opacity 200ms ease ${complete ? index * 40 : 0}ms`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
