import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/common';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
};

/**
 * Page title row in the role's heading face (Archivo signage, or Newsreader on
 * buyer screens). Actions on the right wrap under the title on phones.
 */
export function AppHeader({ title, subtitle, back, right }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-x-sm gap-y-xs pb-2xs">
      {back ? (
        <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} />
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="line-clamp-2 break-words font-heading text-[26px] font-bold leading-[1.12] tracking-[-0.02em] text-text lg:text-[34px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 line-clamp-2 text-body-md text-muted">{subtitle}</p> : null}
      </div>
      {right ? (
        <div className="flex shrink-0 flex-wrap items-center gap-xs max-sm:w-full">{right}</div>
      ) : null}
    </div>
  );
}
