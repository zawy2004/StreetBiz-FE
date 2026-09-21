import { forwardRef, InputHTMLAttributes, useId } from 'react';

import { Field, inputShellClass } from './Field';

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
  /** Hard cap matching a backend FluentValidation MaximumLength rule. */
  maxLength?: number;
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
      maxLength,
    },
    ref,
  ) => {
    const id = useId();
    const messageId = `${id}-message`;

    const inputClassName = [
      inputShellClass(error),
      'h-12 w-full px-sm text-body-lg text-text placeholder:text-muted/80 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted',
    ].join(' ');

    const sharedProps = {
      id,
      'data-testid': testID,
      value,
      placeholder,
      autoFocus,
      disabled,
      maxLength,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error || helperText ? messageId : undefined,
    };

    return (
      <Field htmlFor={id} label={label} error={error} helperText={helperText} messageId={messageId}>
        {multiline ? (
          <textarea
            ref={ref as never}
            {...sharedProps}
            onChange={(e) => onChangeText(e.target.value)}
            rows={4}
            className={`${inputClassName} h-auto min-h-[104px] resize-y py-sm`}
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
      </Field>
    );
  },
);
TextField.displayName = 'TextField';
