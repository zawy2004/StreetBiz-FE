import { createRef, useMemo } from 'react';

type Props = {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
  /** Marks the boxes invalid for assistive tech and styling, e.g. after a wrong code. */
  invalid?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({ length = 6, value, onChangeText, invalid, autoFocus }: Props) {
  const refs = useMemo(
    () => Array.from({ length }, () => createRef<HTMLInputElement>()),
    [length],
  );

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusBox = (index: number) => {
    const box = refs[Math.max(0, Math.min(index, length - 1))]?.current;
    box?.focus();
    box?.select();
  };

  /**
   * Writes one or more digits starting at `index`. A browser or keyboard that autofills an SMS
   * code puts the whole code into a single box (that is what `one-time-code` does), so any
   * multi-character change is treated like a paste instead of being truncated to one digit.
   */
  const writeDigits = (index: number, text: string) => {
    const typed = text.replace(/\D/g, '');
    if (!typed) return;
    const chunk = typed.slice(0, length - index);
    const next = digits.slice();
    for (let i = 0; i < chunk.length; i += 1) next[index + i] = chunk[i]!;
    onChangeText(next.join(''));
    focusBox(index + chunk.length);
  };

  const clearDigit = (index: number) => {
    const next = digits.slice();
    next[index] = '';
    onChangeText(next.join(''));
  };

  return (
    <div className="flex justify-center gap-2.5" role="group" aria-label={`Mã xác thực ${length} số`}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={refs[index]}
          value={digit}
          onChange={(e) => {
            // Deleting a digit leaves an empty value; anything else is new input.
            if (e.target.value === '') clearDigit(index);
            else writeDigits(index, e.target.value);
          }}
          onFocus={(e) => e.target.select()}
          onPaste={(e) => {
            e.preventDefault();
            writeDigits(index, e.clipboardData.getData('text'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digit && index > 0) {
              e.preventDefault();
              clearDigit(index - 1);
              focusBox(index - 1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              focusBox(index - 1);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              focusBox(index + 1);
            }
          }}
          aria-label={`Số thứ ${index + 1} trên ${length}`}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus && index === 0}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          inputMode="numeric"
          className={`input-shell h-14 w-12 rounded-sm border bg-card text-center text-headline-lg font-tabular text-text focus:border-primary focus:shadow-[0_0_0_3px_rgb(var(--c-primary)/0.16)] ${
            invalid ? 'border-error' : 'border-border'
          }`}
        />
      ))}
    </div>
  );
}
