import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common/Icon';
import { statusTones } from '@/theme';

export type CalloutTone = 'ok' | 'pending' | 'danger' | 'neutral';

const DEFAULT_ICON: Record<CalloutTone, IconName> = {
  ok: 'check-circle-outline',
  pending: 'information-outline',
  danger: 'alert-circle-outline',
  neutral: 'information-outline',
};

type Props = { tone: CalloutTone; icon?: IconName; children: ReactNode };

/** A short tinted note inside a card: the ward's reason, a warning or a confirmation. */
export function Callout({ tone, icon = DEFAULT_ICON[tone], children }: Props) {
  const { fg, bg, border } = statusTones[tone];
  return (
    <div
      role="note"
      style={{ backgroundColor: bg, borderColor: border, color: fg }}
      className="flex items-start gap-xs rounded-sm border p-sm text-body-sm"
    >
      <Icon name={icon} size={18} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
