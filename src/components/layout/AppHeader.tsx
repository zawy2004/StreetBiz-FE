import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/common';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
};

/** Page title row. Actions on the right wrap under the title on phones. */
export function AppHeader({ title, subtitle, back, right }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-x-sm gap-y-xs pb-2xs">
      {back ? <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} /> : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-headline-lg text-text lg:text-display-md">{title}</h1>
        {subtitle ? <p className="mt-0.5 line-clamp-2 text-body-md text-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-xs">{right}</div> : null}
    </div>
  );
}
