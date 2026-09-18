import { useId, useState } from 'react';

import { Icon } from '@/components/common';
import { colors } from '@/theme';

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
    <div className="flex flex-col gap-2xs">
      <label htmlFor={id} className="text-label text-text">
        {label}
      </label>
      <div
        className={`flex h-12 items-center gap-xs rounded-sm border bg-card px-sm ${error ? 'border-error' : 'border-border'}`}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full flex-1 bg-transparent text-body-lg text-text placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="flex h-8 w-8 items-center justify-center"
        >
          <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </button>
      </div>
      {error ? (
        <span id={errorId} className="text-body-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
