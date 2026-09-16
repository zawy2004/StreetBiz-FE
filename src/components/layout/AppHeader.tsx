import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/common';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, back, right }: Props) {
  const navigate = useNavigate();

  return (
    <div className="mb-xs flex items-center gap-sm">
      {back ? (
        <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} />
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-headline-lg text-text">{title}</h1>
        {subtitle ? <p className="truncate text-body-md text-muted">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
