import { ReactNode } from 'react';

import { Icon } from '@/components/common';
import { colors, tints } from '@/theme';

type Props = {
  title: string;
  children?: ReactNode;
};

/**
 * Labelled AI-suggestion card. Advisory only — must never be the only path
 * to an approval/rejection/penalty action (see phase-boundary.md).
 */
export function AiHint({ title, children }: Props) {
  return (
    <div
      style={{ backgroundColor: tints.tertiary, borderColor: '#2D7D4633' }}
      className="rounded-md border p-sm"
    >
      <div className="flex items-center gap-1">
        <Icon name="creation" size={16} color={colors.tertiary} />
        <span className="text-badge text-on-tertiary">AI GỢI Ý</span>
      </div>
      <p className="mt-2xs text-headline-sm text-text">{title}</p>
      {children ? <p className="mt-0.5 text-body-md text-muted">{children}</p> : null}
    </div>
  );
}
