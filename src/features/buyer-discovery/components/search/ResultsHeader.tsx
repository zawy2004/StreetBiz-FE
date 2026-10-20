import type { ReactNode } from 'react';

import { Skeleton } from '@/components/feedback';

type Props = {
  /** What the left side says: the idle question, a count, or nothing yet (loading). */
  title: ReactNode | null;
  /** Polite live region for the count, so a screen reader hears the new totals. */
  live?: boolean;
  sort?: ReactNode;
};

/**
 * One line above the results: the count in the editorial face on the left,
 * the order on the right (scrolling sideways on a phone rather than wrapping
 * into a second line). Holds its height so the results never jump under it.
 */
export function ResultsHeader({ title, live = false, sort }: Props) {
  return (
    <div className="flex flex-col gap-sm md:flex-row md:items-end md:justify-between md:gap-md">
      <div
        aria-live={live ? 'polite' : undefined}
        className="flex min-h-[40px] min-w-0 items-end lg:min-h-[48px]"
      >
        {title ?? <Skeleton className="h-9 w-[180px] !rounded-full" />}
      </div>
      {sort ? (
        <div className="no-scrollbar -mx-md overflow-x-auto px-md md:mx-0 md:px-0">
          <div className="flex w-max items-center gap-sm [&_[role=tablist]]:w-max [&_[role=tab]]:flex-none">
            <span className="shrink-0 text-body-sm font-medium text-muted">Xếp theo</span>
            {sort}
          </div>
        </div>
      ) : null}
    </div>
  );
}
