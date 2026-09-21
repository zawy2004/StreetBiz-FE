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
  /** `sm` for toolbars and table rows; the default keeps the 48px outdoor touch target. */
  size?: 'md' | 'sm';
  testID?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
};

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-pressed',
  civic: 'bg-indigo text-on-indigo hover:opacity-90',
  approve: 'bg-tertiary text-white hover:brightness-95 dark:text-[#06140C]',
  outline: 'border border-border bg-card text-text hover:border-muted/50 hover:bg-sunken',
  ghost: 'bg-transparent text-primary hover:bg-tint-primary',
  danger: 'bg-error text-white hover:brightness-95 dark:text-[#1A0604]',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  fullWidth = true,
  size = 'md',
  testID,
  type = 'button',
}: Props) {
  const width = fullWidth ? 'w-full' : 'w-auto';
  const sizing = size === 'sm' ? 'h-9 min-h-9 px-sm text-label' : `h-12 min-h-12 text-[15px] ${fullWidth ? 'px-md' : 'px-lg'}`;

  return (
    <button
      type={type}
      data-testid={testID}
      onClick={onPress}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-sm font-semibold transition-[background-color,border-color,opacity,filter] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45',
        sizing,
        width,
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
