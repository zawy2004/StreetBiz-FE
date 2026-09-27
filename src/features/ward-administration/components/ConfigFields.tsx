import { useId } from 'react';

import { Field, inputShellClass } from '@/components/forms';

const inputClass = (error?: string) =>
  [
    inputShellClass(error),
    'h-12 w-full px-sm text-body-lg text-text disabled:bg-sunken disabled:text-muted',
  ].join(' ');

type NativeProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  min?: string;
  disabled?: boolean;
};

export function DateInput({
  label,
  value,
  onChange,
  error,
  helperText,
  min,
  disabled,
}: NativeProps) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label} error={error} helperText={helperText}>
      <input
        id={id}
        type="date"
        className={inputClass(error)}
        value={value}
        min={min}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TimeInput({ label, value, onChange, error, helperText, disabled }: NativeProps) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label} error={error} helperText={helperText}>
      <input
        id={id}
        type="time"
        className={inputClass(error)}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** VND is always a whole number: digits only, shown with Vietnamese thousand separators. */
export function MoneyInput({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
}: Omit<NativeProps, 'value' | 'onChange' | 'min'> & {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label} error={error} helperText={helperText}>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          className={`${inputClass(error)} pr-10`}
          value={value == null ? '' : value.toLocaleString('vi-VN')}
          disabled={disabled}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            onChange(digits ? Number(digits) : null);
          }}
        />
        <span className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-muted">
          đ
        </span>
      </div>
    </Field>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-sm text-body-md text-text">
      <input
        type="checkbox"
        className="h-5 w-5"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
