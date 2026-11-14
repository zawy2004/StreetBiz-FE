import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useScrollFade } from '@/hooks/useScrollFade';

const TABS = [
  { to: '/vendor/slots/rental-applications', label: 'Đơn thuê ô' },
  { to: '/vendor/slots/contracts', label: 'Hợp đồng thuê ô' },
  { to: '/vendor/slots/transfers', label: 'Chuyển nhượng ô' },
  { to: '/vendor/slots/slot-proposals/new', label: 'Đề xuất ô mới' },
] as const;

/**
 * Switches between the four "Thuê ô của tôi" pages without going back to the
 * hub: a segmented bar, the current page lit orange with a strip of painted
 * kerb beneath it.
 */
export function MySlotsTabs() {
  // The faded edge shows the strip goes on ("Chuyển nhượng ô", "Đề xuất ô mới" sat off-screen
  // with nothing to say they were there).
  const { ref: nav, style: fade, update } = useScrollFade<HTMLElement>();
  const { pathname } = useLocation();

  // On a narrow screen the strip scrolls sideways; keep the current tab in view.
  useEffect(() => {
    nav.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
    update();
  }, [pathname, nav, update]);

  return (
    <nav
      ref={nav}
      aria-label="Thuê ô của tôi"
      style={fade}
      className="no-scrollbar -mx-md overflow-x-auto px-md py-1 md:mx-0 md:px-0"
    >
      <div className="flex w-max gap-1 rounded-[14px] bg-card p-1 shadow-card ring-1 ring-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            replace
            className={({ isActive }) =>
              [
                'relative flex h-11 shrink-0 items-center overflow-hidden whitespace-nowrap rounded-[10px] px-md text-label transition-colors duration-150',
                'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
                isActive
                  ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_18px_-10px_rgb(var(--c-primary)/0.8)]'
                  : 'text-muted hover:bg-sunken hover:text-text',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {tab.label}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="sb-kerb absolute inset-x-0 bottom-0"
                    style={{ height: 4 }}
                  />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
