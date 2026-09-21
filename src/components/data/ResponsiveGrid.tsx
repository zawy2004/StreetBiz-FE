import { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Smallest a cell may get before the grid drops a column. */
  minItemWidth?: number;
  gap?: 'sm' | 'md' | 'lg';
  /** Stretch the cells to fill the row (stat strips) instead of keeping empty tracks (card lists). */
  fit?: boolean;
  className?: string;
};

const gapClass = { sm: 'gap-sm', md: 'gap-md', lg: 'gap-lg' } as const;

/**
 * Fills the row with as many columns as fit at `minItemWidth`; one column on a
 * narrow phone. No breakpoints to maintain — the content decides.
 */
export function ResponsiveGrid({ children, minItemWidth = 260, gap = 'md', fit = false, className }: Props) {
  return (
    <div
      style={{ '--grid-min': `${minItemWidth}px` } as CSSProperties}
      className={`grid ${fit ? 'grid-cols-[repeat(auto-fit,minmax(min(100%,var(--grid-min)),1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(min(100%,var(--grid-min)),1fr))]'} ${gapClass[gap]} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
