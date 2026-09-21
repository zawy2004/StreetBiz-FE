import { Link, NavLink } from 'react-router-dom';

import { Avatar, BrandLogo, Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { ThemeToggle } from './ThemeToggle';

export const SIDEBAR_WIDTH = 248;

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
 * Role navigation: a fixed sidebar on desktop (>=1024px), a bottom tab bar on
 * phones and tablets. Active state comes from ordinary route matching via
 * react-router's NavLink.
 */
export function RoleTabBar({ roleLabel, items }: Props) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <Sidebar roleLabel={roleLabel} items={items} /> : <BottomTabBar items={items} />;
}

function Sidebar({ roleLabel, items }: Props) {
  const user = useAuthStore((s) => s.user);
  const accountTo = items.find((i) => i.to.endsWith('/account'))?.to ?? '/account';
  const navItems = items.filter((i) => i.to !== accountTo);

  return (
    <nav
      aria-label="Điều hướng chính"
      style={{ width: SIDEBAR_WIDTH }}
      className="flex h-full shrink-0 flex-col border-r border-border bg-card"
    >
      <div className="flex h-16 items-center gap-sm px-md">
        <BrandLogo size={28} />
        <div className="min-w-0">
          <p className="text-headline-md leading-none text-text">StreetBiz</p>
          <p className="mt-1 truncate text-body-xs text-muted">{roleLabel}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-sm py-xs">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'relative flex h-10 items-center gap-sm rounded-sm px-sm text-body-md transition-colors',
                isActive ? 'bg-tint-primary font-semibold text-primary' : 'text-text hover:bg-sunken',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span aria-hidden="true" className="absolute -left-sm top-2 h-6 w-[3px] rounded-r-full bg-primary" />
                ) : null}
                <Icon name={item.icon} size={20} color={isActive ? colors.primary : colors.muted} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col gap-sm border-t border-border p-sm">
        <ThemeToggle />
        {user ? (
          <Link
            to={accountTo}
            className="flex items-center gap-sm rounded-sm p-xs transition-colors hover:bg-sunken"
          >
            <Avatar name={user.fullName} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-semibold text-text">{user.fullName}</p>
              <p className="truncate text-body-xs text-muted">Tài khoản và bảo mật</p>
            </div>
            <Icon name="cog-outline" size={18} color={colors.muted} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function BottomTabBar({ items }: { items: RoleTabItem[] }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="flex shrink-0 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-xs"
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-tint-primary' : ''}`}
              >
                <Icon name={item.icon} size={22} color={isActive ? colors.primary : colors.muted} />
              </span>
              <span
                className={`max-w-full truncate px-1 text-body-xs ${isActive ? 'font-semibold text-primary' : 'text-muted'}`}
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
