import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/**
 * Bottom-pinned bar for the primary (and optional secondary) action. Full-width
 * thumb targets on phones; on web the buttons sit at the right at their natural width.
 */
export function StickyActions({ children }: Props) {
  return (
    <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1040px] gap-sm p-md md:px-lg lg:justify-end lg:px-xl lg:[&>*]:w-auto lg:[&>*]:min-w-[200px] lg:[&>*]:flex-none">
        {children}
      </div>
    </div>
  );
}
