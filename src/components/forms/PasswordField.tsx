import { useId, useState } from 'react';

import { Icon } from '@/components/common';
import { colors } from '@/theme';
import { Field, inputShellClass } from './Field';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  /** Lets the browser tell a sign-in field apart from a new-password field. */
  autoComplete?: 'current-password' | 'new-password' | 'off';
};

export function PasswordField({
  value,
  onChangeText,
  label = 'Mật khẩu',
  error,
  placeholder,
  autoComplete = 'off',
}: Props) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Field htmlFor={id} label={label} error={error} messageId={errorId}>
      <div className={`${inputShellClass(error)} flex h-12 items-center gap-xs pl-sm pr-1`}>
        <input
          id={id}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-text outline-none placeholder:text-muted/80"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="flex h-10 w-10 items-center justify-center rounded-sm hover:bg-sunken"
        >
          <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </button>
      </div>
    </Field>
  );
}
