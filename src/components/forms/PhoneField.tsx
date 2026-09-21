import { useId } from 'react';

import { Field, inputShellClass } from './Field';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  error?: string;
};

export function PhoneField({ value, onChangeText, label = 'Số điện thoại', error }: Props) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Field htmlFor={id} label={label} error={error} messageId={errorId}>
      <div className={`${inputShellClass(error)} flex h-12 items-center gap-xs px-sm`}>
        <span className="border-r border-border pr-xs text-body-lg text-muted">+84</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          inputMode="tel"
          type="tel"
          placeholder="912 345 678"
          autoComplete="tel-national"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-text outline-none placeholder:text-muted/80"
        />
      </div>
    </Field>
  );
}
