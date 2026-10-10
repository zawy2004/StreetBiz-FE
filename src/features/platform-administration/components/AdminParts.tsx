import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Icon, Spinner, type IconName } from '@/components/common';
import { ErrorState } from '@/components/feedback';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { ROLE_ORDER, ROLE_SWATCH } from './admin-format';

/**
 * A mango band that says how far to trust the numbers or actions on screen
 * (sample data, browser-only changes). Mango, never red: it is not an error.
 */
export function InfoBand({
  children,
  icon = 'information-outline',
}: {
  children: ReactNode;
  icon?: IconName;
}) {
  return (
    <p className="flex items-start gap-xs rounded-[12px] bg-secondary-bg px-sm py-xs text-body-sm font-medium text-on-secondary ring-1 ring-secondary/30">
      <Icon name={icon} size={18} color="currentColor" className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Who uses the platform, as one bar of four proportional segments with a
 * legend of words and numbers (never colour alone). A role at 0 draws no
 * segment but keeps its legend entry.
 */
export function RoleMixBar({
  counts,
  suspended,
  compact,
}: {
  counts: Record<RoleCode, number>;
  /** Shown after the legend: "{n} đang khoá". */
  suspended?: number;
  compact?: boolean;
}) {
  const total = ROLE_ORDER.reduce((sum, role) => sum + counts[role], 0);
  const label = ROLE_ORDER.map((role) => `${ROLE_LABELS[role]} ${counts[role]}`).join(', ');

  return (
    <div className="flex min-w-0 flex-col gap-xs">
      <div
        role="img"
        aria-label={`Tài khoản theo vai trò: ${label}`}
        className={`group/mix flex w-full overflow-hidden rounded-full bg-sunken ${compact ? 'h-2.5' : 'h-3'}`}
      >
        {total > 0
          ? ROLE_ORDER.filter((role) => counts[role] > 0).map((role) => (
              <span
                key={role}
                data-role={role}
                style={{ width: `${(counts[role] / total) * 100}%` }}
                className={`h-full border-r-2 border-card transition-opacity duration-150 last:border-r-0 group-hover/mix:opacity-55 hover:!opacity-100 ${ROLE_SWATCH[role].bar}`}
              />
            ))
          : null}
      </div>
      <ul className="flex flex-wrap gap-x-md gap-y-1 text-body-sm text-text">
        {ROLE_ORDER.map((role) => (
          <li key={role} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-[3px] ${ROLE_SWATCH[role].dot}`}
            />
            <span className="text-muted">{ROLE_LABELS[role]}</span>
            <span className="font-sign font-semibold font-tabular">{counts[role]}</span>
          </li>
        ))}
        {suspended !== undefined ? (
          <li className="flex items-center gap-1.5">
            <Icon name="lock-outline" size={14} color="currentColor" className="text-error" />
            <span className="font-sign font-semibold font-tabular">{suspended}</span>
            <span className="text-muted">đang khoá</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

type PanelVariant = 'outline' | 'danger' | 'approve' | 'primary';

const panelVariant: Record<PanelVariant, string> = {
  outline: 'bg-card text-text ring-1 ring-inset ring-border hover:bg-sunken hover:ring-text/25',
  danger: 'bg-error text-white hover:brightness-90 dark:text-[#1A0604]',
  approve: 'bg-tertiary text-white hover:brightness-95 dark:text-[#06140C]',
  primary: 'bg-primary text-on-primary hover:bg-primary-pressed',
};

/**
 * The shared Button's look, as a native button that can point at the sentence
 * describing it (`aria-describedby`). Same label, same disabled rules.
 */
export function PanelButton({
  label,
  onPress,
  variant = 'outline',
  disabled,
  loading,
  icon,
  describedBy,
  size = 'md',
  className = '',
  onFocus,
}: {
  label: string;
  onPress: () => void;
  variant?: PanelVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  describedBy?: string;
  size?: 'md' | 'sm';
  className?: string;
  onFocus?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      onFocus={onFocus}
      onMouseEnter={onFocus}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-describedby={describedBy}
      className={[
        'group/btn inline-flex shrink-0 items-center justify-center gap-xs font-semibold transition-[background-color,box-shadow,filter,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm'
          ? 'h-11 rounded-[10px] px-sm text-label'
          : 'h-12 rounded-[12px] px-md text-[15px]',
        panelVariant[variant],
        className,
      ].join(' ')}
    >
      {loading ? <Spinner size={18} /> : icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export type TimelineStep = {
  key: string;
  title: string;
  /** Who and when, already formatted. */
  detail?: ReactNode;
  /** A dashed, hollow dot: the step has not happened yet. */
  waiting?: boolean;
};

/** Two (or more) dots joined by a rule: the life of a report or a complaint so far. */
export function Timeline({ steps, label }: { steps: TimelineStep[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex gap-sm pb-md last:pb-0">
          {i < steps.length - 1 ? (
            <span
              aria-hidden="true"
              className={`absolute left-[7px] top-5 h-[calc(100%-12px)] w-0.5 ${steps[i + 1]?.waiting ? 'border-l-2 border-dashed border-border bg-transparent' : 'bg-border'}`}
            />
          ) : null}
          <span
            aria-hidden="true"
            className={`relative mt-1 h-4 w-4 shrink-0 rounded-full ${step.waiting ? 'border-2 border-dashed border-muted/70 bg-card' : 'border-[3px] border-card bg-primary ring-2 ring-primary/30'}`}
          />
          <div className="min-w-0">
            <p className="text-label text-text">{step.title}</p>
            {step.detail ? (
              <div className="mt-0.5 text-body-sm text-muted">{step.detail}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A failed detail lookup: the shared error panel, plus a way back to the queue so nobody is stuck. */
export function DetailLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <ErrorState message={message} onRetry={onRetry} />
      <Link
        to="/platform/moderation"
        className="-mt-md inline-flex h-11 items-center gap-1.5 rounded-full px-md text-label font-semibold text-primary hover:bg-tint-primary"
      >
        <Icon name="arrow-left" size={16} color="currentColor" />
        Về hàng đợi kiểm duyệt
      </Link>
    </div>
  );
}

/** Small round card wrapper with a heading, for the detail screens' side panels. */
export function PanelCard({
  children,
  className = '',
  as: Tag = 'section',
  label,
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  label?: string;
}) {
  return (
    <Tag
      aria-label={label}
      className={`rounded-[20px] bg-card shadow-card ring-1 ring-border/80 ${className}`}
    >
      {children}
    </Tag>
  );
}
