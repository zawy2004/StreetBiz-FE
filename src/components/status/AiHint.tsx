import { ReactNode } from 'react';

import { Icon } from '@/components/common';
import { colors } from '@/theme';

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
    <div className="rounded-md border border-secondary/30 bg-tint-secondary p-sm">
      <div className="flex items-center gap-1.5 text-body-sm font-semibold text-on-secondary">
        <Icon name="creation" size={16} color={colors.onSecondary} />
        Gợi ý AI, chỉ để tham khảo
      </div>
      <p className="mt-xs text-headline-sm text-text">{title}</p>
      {children ? <div className="mt-1 text-body-md text-muted">{children}</div> : null}
    </div>
  );
}
