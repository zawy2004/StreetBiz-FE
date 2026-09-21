import { ReactNode } from 'react';

type Width = 'narrow' | 'default' | 'wide' | 'full';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
  /**
   * Content column on web: `narrow` for single forms and detail pages,
   * `default` for most screens, `wide` for tables and dashboards.
   */
  width?: Width;
};

export const SCREEN_WIDTH: Record<Width, string> = {
  narrow: 'max-w-[760px]',
  default: 'max-w-[1040px]',
  wide: 'max-w-[1320px]',
  full: 'max-w-none',
};

/** Base screen container: scrolls, pads, and caps line length on wide viewports. */
export function Screen({ children, scroll = true, padded = true, footer, width = 'default' }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-bg">
      <div className={['min-h-0 flex-1', scroll ? 'overflow-y-auto' : 'overflow-hidden'].join(' ')}>
        {padded ? (
          <div
            className={[
              'cq mx-auto flex w-full flex-col gap-md p-md pb-xl md:px-lg lg:px-xl lg:py-lg',
              SCREEN_WIDTH[width],
            ].join(' ')}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
      {footer}
    </div>
  );
}
