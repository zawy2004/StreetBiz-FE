import { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner } from './Spinner';

export type ButtonVariant =
  'primary' | 'accent' | 'civic' | 'approve' | 'outline' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  /** `sm` for toolbars and table rows; the default keeps the 48px outdoor touch target; `lg` (56px) for a vendor's main action. */
  size?: 'md' | 'sm' | 'lg';
  /** Id of the text that explains the button (e.g. why it is disabled). */
  describedBy?: string;
  testID?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
};

/**
 * `primary` street orange for most actions (with a soft orange lift); `accent`
 * mango with ink text; `civic` ink for administrative steps; `approve` leaf green.
 */
const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary shadow-[0_10px_22px_-12px_rgb(var(--c-primary)/0.9)] hover:bg-primary-pressed',
  accent: 'bg-accent text-on-accent hover:bg-accent-pressed',
  civic: 'bg-indigo text-on-indigo hover:opacity-90',
  approve: 'bg-tertiary text-white hover:brightness-95 dark:text-[#06140C]',
  outline: 'bg-card text-text ring-1 ring-inset ring-border hover:bg-sunken hover:ring-text/25',
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
  describedBy,
  testID,
  type = 'button',
}: Props) {
  const width = fullWidth ? 'w-full' : 'w-auto';
  const sizing =
    size === 'sm'
      ? 'h-9 min-h-9 rounded-sm px-sm text-label'
      : size === 'lg'
        ? `h-14 min-h-14 rounded-[14px] text-[16px] ${fullWidth ? 'px-md' : 'px-xl'}`
        : `h-12 min-h-12 rounded-[12px] text-[15px] ${fullWidth ? 'px-md' : 'px-lg'}`;

  return (
    <button
      type={type}
      data-testid={testID}
      onClick={onPress}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-describedby={describedBy}
      className={[
        'inline-flex shrink-0 items-center justify-center font-semibold transition-[background-color,border-color,opacity,filter,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45',
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
