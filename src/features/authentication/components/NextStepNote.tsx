import type { ReactNode } from 'react';

import { Icon } from '@/components/common';

/** "What happens after this step", said before the user presses the button. */
export function NextStepNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-xs text-body-sm text-muted">
      <span className="mt-[2px] shrink-0">
        <Icon name="information-outline" size={16} color="currentColor" />
      </span>
      <span>{children}</span>
    </p>
  );
}
