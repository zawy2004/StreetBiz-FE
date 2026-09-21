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
      style={{ backgroundColor: tints.gold, borderColor: colors.goldBorder }}
      className="rounded-md border p-sm shadow-sm transition-all"
    >
      <div className="flex items-center gap-1.5">
        <Icon name="creation" size={16} color={colors.gold} />
        <span className="rounded border border-gold/30 bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#8A5A00]">
          [AI] GỢI Ý THAM KHẢO
        </span>
      </div>
      <p className="mt-xs text-headline-sm font-semibold text-text">{title}</p>
      {children ? <div className="mt-1 text-body-md text-muted">{children}</div> : null}
    </div>
  );
}
