import type { ReactNode } from 'react';

import { BackButton } from '@/features/buyer-discovery/components/BackButton';

type Props = {
  title: string;
  subtitle?: string;
  /** Root tabs (the scan screen) have no way back. */
  back?: boolean;
  right?: ReactNode;
};

/**
 * Page title for the buyer's community screens, in the editorial face at the
 * buyer's size (32/40), with a 44px back button. The page's only `h1`.
 */
export function BuyerPageHeader({ title, subtitle, back = true, right }: Props) {
  return (
    <header className="flex flex-wrap items-start gap-x-sm gap-y-xs">
      {back ? <BackButton /> : null}
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="font-editorial text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] lg:text-[40px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-body-md text-muted">{subtitle}</p> : null}
      </div>
      {right ? (
        <div className="order-last flex basis-full items-center sm:order-none sm:basis-auto sm:shrink-0">
          {right}
        </div>
      ) : null}
    </header>
  );
}
