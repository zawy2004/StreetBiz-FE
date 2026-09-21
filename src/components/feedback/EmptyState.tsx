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
 * Nothing here yet — drawn as an empty sidewalk slot: the painted dashed
 * outline with the icon standing where a stall would be.
 */
export function EmptyState({ icon = 'inbox-outline', title, description, action, tone = 'neutral', compact }: Props) {
  const accent = tone === 'danger' ? colors.error : colors.muted;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'px-md py-lg' : 'px-lg py-2xl'}`}
    >
      {compact ? (
        <Icon name={icon} size={28} color={accent} />
      ) : (
        <div className="relative flex h-[88px] w-[120px] items-center justify-center">
          <svg viewBox="0 0 120 88" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <rect
              x="3"
              y="3"
              width="114"
              height="82"
              rx="8"
              style={{
                fill: tone === 'danger' ? 'rgb(var(--c-error) / 0.06)' : 'rgb(var(--c-secondary) / 0.07)',
                stroke: tone === 'danger' ? 'rgb(var(--c-error) / 0.5)' : 'rgb(var(--c-secondary) / 0.7)',
                strokeWidth: 2,
                strokeDasharray: '8 6',
              }}
            />
          </svg>
          <Icon name={icon} size={34} color={accent} />
        </div>
      )}
      <p className={`${compact ? 'mt-xs' : 'mt-md'} text-headline-sm text-text`}>{title}</p>
      {description ? <p className="mt-1 max-w-[46ch] text-body-md text-muted">{description}</p> : null}
      {action ? <div className="mt-md">{action}</div> : null}
    </div>
  );
}
