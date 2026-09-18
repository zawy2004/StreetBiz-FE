import { createRef, useMemo } from 'react';

type Props = {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
};

export function OtpInput({ length = 6, value, onChangeText }: Props) {
  const refs = useMemo(
    () => Array.from({ length }, () => createRef<HTMLInputElement>()),
    [length],
  );

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

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

  return (
    <div className="flex justify-center gap-2.5" role="group" aria-label="Mã xác thực 6 số">
      {digits.map((digit, index) => (
        <input
          key={index}
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
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          inputMode="numeric"
          maxLength={1}
          className="h-14 w-12 rounded-sm border border-border bg-card text-center text-headline-lg text-text"
        />
      ))}
    </div>
  );
}
