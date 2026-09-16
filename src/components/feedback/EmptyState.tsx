import { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { colors } from '@/theme';

type Props = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon = 'inbox-outline', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-lg py-xl text-center">
      <Icon name={icon} size={40} color={colors.muted} />
      <p className="mt-sm text-headline-sm text-text">{title}</p>
      {description ? <p className="mt-1 text-body-md text-muted">{description}</p> : null}
      {action ? <div className="mt-md">{action}</div> : null}
    </div>
  );
}
