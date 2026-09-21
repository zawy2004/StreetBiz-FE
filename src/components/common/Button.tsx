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
  primary: 'bg-gradient-to-r from-primary to-[#CE5B49] text-on-primary shadow-sm hover:shadow-md hover:brightness-105 active:scale-[0.99]',
  civic: 'bg-indigo text-on-indigo border border-gold/35 hover:bg-[#252E3D] hover:border-gold/60 shadow-sm active:scale-[0.99]',
  approve: 'bg-gradient-to-r from-tertiary to-[#2E6B5C] text-white shadow-sm hover:shadow-md hover:brightness-105 active:scale-[0.99]',
  outline: 'bg-card text-text border border-border hover:border-gold/60 hover:bg-gold-light/30 active:scale-[0.99]',
  ghost: 'bg-transparent text-primary hover:bg-tint-primary active:scale-[0.99]',
  danger: 'bg-error text-white shadow-sm hover:brightness-105 active:scale-[0.99]',
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
        'inline-flex h-12 min-h-12 items-center justify-center rounded-sm text-headline-sm font-medium transition-all duration-150 active:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100',
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
