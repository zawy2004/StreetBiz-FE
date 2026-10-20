import { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { colors } from '@/theme';

type Props = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  /** `danger` for failures; `compact` drops the illustration for use inside tables and small cards. */
  tone?: 'neutral' | 'danger';
  compact?: boolean;
};

/**
 * Nothing here yet, drawn as an empty sidewalk slot: a bright painted dashed
 * outline on a soft orange wash, the icon standing where a stall would be,
 * with the kerb stripe beneath it.
 */
export function EmptyState({
  icon = 'inbox-outline',
  title,
  description,
  action,
  tone = 'neutral',
  compact,
}: Props) {
  const accent = tone === 'danger' ? colors.error : colors.primary;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'px-md py-lg' : 'px-lg py-2xl'}`}
    >
      {compact ? (
        <Icon name={icon} size={28} color={accent} />
      ) : (
        <div className="relative flex h-[112px] w-[156px] items-center justify-center">
          <svg viewBox="0 0 156 112" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <rect
              x="4"
              y="4"
              width="148"
              height="92"
              rx="16"
              style={{
                fill:
                  tone === 'danger' ? 'rgb(var(--c-error) / 0.07)' : 'rgb(var(--c-brand) / 0.08)',
                stroke:
                  tone === 'danger' ? 'rgb(var(--c-error) / 0.55)' : 'rgb(var(--c-brand) / 0.6)',
                strokeWidth: 2.5,
                strokeDasharray: '10 7',
              }}
            />
            {Array.from({ length: 7 }, (_, i) => (
              <rect
                key={i}
                x={4 + i * 22}
                y="102"
                width="22"
                height="6"
                rx="1"
                style={{
                  fill:
                    i % 2
                      ? 'rgb(var(--c-kerb-paint))'
                      : tone === 'danger'
                        ? 'rgb(var(--c-error) / 0.7)'
                        : 'rgb(var(--c-kerb))',
                }}
              />
            ))}
          </svg>
          <span className="relative -mt-2.5 flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-card">
            <Icon name={icon} size={28} color={accent} weight="duotone" />
          </span>
        </div>
      )}
      <p
        className={`${compact ? 'mt-xs text-headline-sm' : 'mt-md font-heading text-[19px] font-bold'} text-text`}
      >
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-[46ch] text-body-md text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-md">{action}</div> : null}
    </div>
  );
}
