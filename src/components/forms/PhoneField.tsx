import { useId } from 'react';

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
    <div className="flex flex-col gap-2xs">
      <label htmlFor={id} className="text-label text-text">
        {label}
      </label>
      <div
        className={`flex h-12 items-center gap-xs rounded-sm border bg-card px-sm ${error ? 'border-error' : 'border-border'}`}
      >
        <span className="text-body-lg text-muted">+84</span>
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
          className="h-full flex-1 bg-transparent text-body-lg text-text placeholder:text-muted"
        />
      </div>
      {error ? (
        <span id={errorId} className="text-body-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
