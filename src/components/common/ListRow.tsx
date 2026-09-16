import { ReactNode } from 'react';

import { Icon } from './Icon';
import { colors } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  testID?: string;
};

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  showChevron,
  testID,
}: Props) {
  const content = (
    <>
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-headline-sm text-text">{title}</span>
        {subtitle ? (
          <span className="line-clamp-2 text-body-md text-muted">{subtitle}</span>
        ) : null}
      </div>
      {trailing}
      {showChevron ? <Icon name="chevron-right" size={20} color={colors.muted} /> : null}
    </>
  );

  if (onPress) {
    return (
      <button
        type="button"
        data-testid={testID}
        onClick={onPress}
        className="flex w-full items-center gap-sm py-sm text-left transition-opacity active:opacity-85"
      >
        {content}
      </button>
    );
  }

  return (
    <div data-testid={testID} className="flex w-full items-center gap-sm py-sm">
      {content}
    </div>
  );
}
