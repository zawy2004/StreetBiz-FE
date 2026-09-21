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
        className="flex shrink-0 flex-col border-r border-[#E8E2D5]/15 bg-[#181F28] p-md text-[#FDFBF7] shadow-lg"
      >
        <div className="mb-lg flex items-center gap-sm">
          <BrandLogo size={32} />
          <div className="flex flex-col">
            <span className="font-serif text-[22px] font-bold tracking-tight text-[#FDFBF7]">StreetBiz</span>
            <span className="text-[10px] font-medium tracking-widest text-gold/80 uppercase">Đà Nẵng Civic Tech</span>
          </div>
        </div>
        <span className="mb-md w-fit rounded border border-gold/25 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-gold">
          {roleLabel.toUpperCase()}
        </span>
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex h-11 items-center gap-sm rounded-lg px-sm text-body-md transition-all duration-150',
                  isActive
                    ? 'border border-primary/40 bg-primary/20 font-medium text-[#FDFBF7] shadow-sm'
                    : 'text-[#D1D5DB] hover:bg-white/5 hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    size={22}
                    color={isActive ? '#E57361' : '#A0AAB8'}
                  />
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
    <nav className="flex border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(28,35,46,0.04)]">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-xs transition-colors"
        >
          {({ isActive }) => (
            <>
              <Icon
                name={item.icon}
                size={22}
                color={isActive ? colors.primary : colors.muted}
              />
              <span
                className={`truncate text-body-sm ${
                  isActive ? 'font-semibold text-primary' : 'text-muted'
                }`}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
