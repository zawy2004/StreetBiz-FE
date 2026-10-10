import { useId } from 'react';

import { Field } from '@/components/forms';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  error?: string;
};

/**
 * The one field of the reset request, drawn large like a number plate: the
 * "+84" piece on its own panel, the digits in wide signage figures. Same input
 * as the shared `PhoneField` (type, keyboard, autocomplete, placeholder,
 * label and error wiring); only the size and look differ.
 */
export function PlatePhoneField({ value, onChangeText, label = 'Số điện thoại', error }: Props) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Field htmlFor={id} label={label} error={error} messageId={errorId}>
      <div
        className={[
          'flex h-16 items-stretch overflow-hidden rounded-[14px] border-2 bg-card transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgb(var(--c-primary)/0.16)]',
          error ? 'border-error' : 'border-text/85 dark:border-text/60',
        ].join(' ')}
      >
        <span className="flex shrink-0 items-center border-r-2 border-inherit bg-sunken px-sm font-sign text-[18px] font-semibold text-muted [font-stretch:90%]">
          +84
        </span>
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
          className="h-full min-w-0 flex-1 bg-transparent px-sm font-sign text-[22px] font-semibold leading-[30px] tracking-[0.06em] text-text outline-none font-tabular placeholder:font-medium placeholder:text-muted/70 sm:text-[24px] sm:leading-[32px]"
        />
      </div>
    </Field>
  );
}
