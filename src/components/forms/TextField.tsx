import { forwardRef, InputHTMLAttributes, useId } from 'react';

type KeyboardType = 'default' | 'number-pad' | 'numeric' | 'phone-pad' | 'email-address';

type InputMode = InputHTMLAttributes<HTMLInputElement>['inputMode'];

type Props = {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardType;
  multiline?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  testID?: string;
};

const inputModeByKeyboardType: Record<KeyboardType, { inputMode?: InputMode; type: string }> = {
  default: { type: 'text' },
  'number-pad': { inputMode: 'numeric', type: 'text' },
  numeric: { inputMode: 'numeric', type: 'text' },
  'phone-pad': { inputMode: 'tel', type: 'tel' },
  'email-address': { inputMode: 'email', type: 'email' },
};

export const TextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  (
    {
      label,
      error,
      helperText,
      value,
      onChangeText,
      placeholder,
      keyboardType = 'default',
      multiline,
      autoFocus,
      disabled,
      testID,
    },
    ref,
  ) => {
    const id = useId();
    const messageId = `${id}-message`;

    const inputClassName = [
      'h-12 w-full rounded-sm border bg-card px-sm text-body-lg text-text placeholder:text-muted',
      error ? 'border-error' : 'border-border',
    ].join(' ');

    const sharedProps = {
      id,
      'data-testid': testID,
      value,
      placeholder,
      autoFocus,
      disabled,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error || helperText ? messageId : undefined,
    };

    return (
      <div className="flex flex-col gap-2xs">
        {label ? (
          <label htmlFor={id} className="text-label text-text">
            {label}
          </label>
        ) : null}
        {multiline ? (
          <textarea
            ref={ref as never}
            {...sharedProps}
            onChange={(e) => onChangeText(e.target.value)}
            rows={4}
            className={`${inputClassName} h-auto min-h-[96px] py-sm`}
          />
        ) : (
          <input
            ref={ref as never}
            {...sharedProps}
            onChange={(e) => onChangeText(e.target.value)}
            {...inputModeByKeyboardType[keyboardType]}
            className={inputClassName}
          />
        )}
        {error ? (
          <span id={messageId} className="text-body-sm text-error">
            {error}
          </span>
        ) : helperText ? (
          <span id={messageId} className="text-body-sm text-muted">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  },
);
TextField.displayName = 'TextField';
