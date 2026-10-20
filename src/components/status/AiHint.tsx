import { ReactNode } from 'react';

import { Icon } from '@/components/common';

type Props = {
  title: string;
  children?: ReactNode;
};

/**
 * Labelled AI-suggestion card, drawn as a yellow advisory sign: it informs, it
 * never decides. Advisory only — must never be the only path to an
 * approval/rejection/penalty action (see phase-boundary.md).
 */
export function AiHint({ title, children }: Props) {
  return (
    <div className="rounded-md border border-secondary/40 border-l-[5px] border-l-secondary bg-secondary-bg/70 p-sm pl-md">
      <div className="flex items-center gap-1.5 text-body-sm font-semibold text-on-secondary">
        <Icon name="creation" size={16} color="currentColor" weight="fill" />
        Gợi ý AI, chỉ để tham khảo
      </div>
      <p className="mt-xs text-headline-sm text-text">{title}</p>
      {children ? <div className="mt-1 text-body-md text-text/75">{children}</div> : null}
    </div>
  );
}
