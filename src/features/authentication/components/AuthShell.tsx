import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { BrandLogo, IconButton } from '@/components/common';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, back, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col p-lg pt-xl">
        {back ? (
          <div className="mb-sm">
            <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} />
          </div>
        ) : null}
        <div className="mb-lg flex flex-col items-center">
          <BrandLogo size={48} />
          <h1 className="mt-sm text-headline-lg text-text">{title}</h1>
          {subtitle ? <p className="mt-1 text-center text-body-md text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col gap-md">{children}</div>
      </div>
    </div>
  );
}
