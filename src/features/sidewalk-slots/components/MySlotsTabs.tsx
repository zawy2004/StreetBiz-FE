import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/vendor/slots/rental-applications', label: 'Đơn thuê ô' },
  { to: '/vendor/slots/contracts', label: 'Hợp đồng thuê ô' },
  { to: '/vendor/slots/transfers', label: 'Chuyển nhượng ô' },
  { to: '/vendor/slots/slot-proposals/new', label: 'Đề xuất ô mới' },
] as const;

/** Switches between the four "Thuê ô của tôi" pages without going back to the hub. */
export function MySlotsTabs() {
  const nav = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // On a narrow screen the strip scrolls sideways; keep the current tab in view.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    <nav ref={nav} aria-label="Thuê ô của tôi" className="-mx-md flex gap-xs overflow-x-auto px-md py-0.5">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          replace
          className={({ isActive }) =>
            [
              'h-9 shrink-0 whitespace-nowrap rounded-full px-sm text-label leading-9 transition-colors',
              isActive ? 'bg-primary text-on-primary' : 'text-muted hover:bg-tint-muted',
            ].join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
