import { NavLink } from 'react-router-dom';

import { BrandLogo, Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { colors } from '@/theme';

const SIDEBAR_WIDTH = 280;

export type RoleTabItem = {
  to: string;
  label: string;
  icon: IconName;
};

type Props = {
  roleLabel: string;
  items: RoleTabItem[];
};

/**
 * Role-scoped tab bar: fixed indigo sidebar on desktop (>=1024px), bottom
 * bar on mobile/tablet — matches the "Modern Heritage" layout spec (280px
 * sidebar, 24px gutter). Driven by react-router-dom's `NavLink`, so active
 * state and navigation come from ordinary route matching, not a navigator
 * render-prop (that indirection was the root cause of a past "Invalid hook
 * call" bug under expo-router and no longer applies here).
 */
export function RoleTabBar({ roleLabel, items }: Props) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <nav
        style={{ width: SIDEBAR_WIDTH }}
        className="flex shrink-0 flex-col bg-indigo p-md"
      >
        <div className="mb-lg flex items-center gap-xs">
          <BrandLogo size={28} />
          <span className="truncate text-headline-sm text-white">StreetBiz</span>
        </div>
        <span className="mb-sm text-badge text-[#9AA3B8]">{roleLabel.toUpperCase()}</span>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex h-11 items-center gap-sm rounded-lg px-sm text-headline-sm',
                  isActive ? 'bg-white/10 text-primary' : 'text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} size={22} color={isActive ? colors.primary : colors.white} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex border-t border-border bg-card">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-xs"
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} size={22} color={isActive ? colors.primary : colors.muted} />
              <span className={`truncate text-body-sm ${isActive ? 'text-primary' : 'text-muted'}`}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
