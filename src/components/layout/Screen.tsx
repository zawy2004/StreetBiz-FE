import { ReactNode, useEffect, useRef } from 'react';

import { useScreenFooter } from './screen-footer';

/**
 * Publishes the height of a screen's action bar (the `footer`: "Tiếp tục", "Nộp hồ sơ",
 * "Thanh toán"…) as --sb-screen-footer, so the floating assistant launcher sits above the
 * bar instead of on top of its buttons. Reset when the screen goes away.
 */
function useFooterClearance(footer: ReactNode) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el) return;
    const publish = () => root.style.setProperty('--sb-screen-footer', `${el.offsetHeight}px`);
    publish();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--sb-screen-footer');
    };
  }, [footer]);
  return ref;
}

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
export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  width = 'default',
}: Props) {
  const shellFooter = useScreenFooter();
  const footerRef = useFooterClearance(footer);
  // A short page must not leave the footer floating mid-screen: let the content take the spare
  // height so the footer sits at the bottom of the scroller.
  const footerAtBottom = scroll && padded && shellFooter != null;
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-bg">
      <div
        className={[
          'min-h-0 flex-1',
          scroll ? 'overflow-y-auto' : 'overflow-hidden',
          footerAtBottom ? 'flex flex-col' : '',
        ].join(' ')}
      >
        {padded ? (
          <div
            className={[
              'cq sb-clear-launcher mx-auto flex w-full flex-col gap-md p-md pb-xl md:px-lg lg:px-xl lg:py-lg',
              footerAtBottom ? 'flex-1' : '',
              SCREEN_WIDTH[width],
            ].join(' ')}
          >
            {children}
          </div>
        ) : (
          children
        )}
        {scroll ? shellFooter : null}
      </div>
      {footer ? (
        <div ref={footerRef} className="shrink-0">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
