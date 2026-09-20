import { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'civic' | 'approve' | 'outline' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  testID?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
};

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary',
  civic: 'bg-indigo text-on-indigo',
  approve: 'bg-tertiary text-white',
  outline: 'bg-transparent text-indigo border border-border',
  ghost: 'bg-transparent text-primary',
  danger: 'bg-error text-white',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  fullWidth = true,
  testID,
  type = 'button',
}: Props) {
  return (
    <button
      type={type}
      data-testid={testID}
      onClick={onPress}
      disabled={disabled || loading}
      className={[
        'inline-flex h-12 min-h-12 items-center justify-center rounded-sm text-headline-sm transition-opacity active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth ? 'w-full px-md' : 'w-auto px-lg',
        variantClass[variant],
      ].join(' ')}
    >
      {loading ? (
        <Spinner size={18} />
      ) : (
        <span className="flex items-center gap-xs truncate">
          {icon}
          {label}
        </span>
      )}
    </button>
  );
}
