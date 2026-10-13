import { Link, NavLink } from 'react-router-dom';

import { Avatar, BrandLogo, Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth-store';
import { ThemeToggle } from './ThemeToggle';

export const SIDEBAR_WIDTH = 248;

export type RoleTabItem = {
  to: string;
  label: string;
  icon: IconName;
  /** Unread count shown on the tab; omitted or 0 renders nothing. */
  badge?: number;
};

/** Shared with the cart badge in ConsumerTopNav so every count looks the same. */
export function NavBadge({ count, className = '' }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-badge font-tabular text-on-accent ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

type Props = {
  roleLabel: string;
  items: RoleTabItem[];
};

/**
 * Role navigation: on desktop (>=1024px) a bright board down the left — ink
 * lettering, the current place lit in a soft orange with the brand bar beside
 * it, like the lit name on a route sign; on phones and tablets a bottom tab bar. Active state comes
 * from ordinary route matching via react-router's NavLink.
 */
export function RoleTabBar({ roleLabel, items }: Props) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <Sidebar roleLabel={roleLabel} items={items} />
  ) : (
    <BottomTabBar items={items} />
  );
}

function Sidebar({ roleLabel, items }: Props) {
  const user = useAuthStore((s) => s.user);
  const accountTo = items.find((i) => i.to.endsWith('/account'))?.to ?? '/account';
  const navItems = items.filter((i) => i.to !== accountTo);

  return (
    <nav
      aria-label="Điều hướng chính"
      style={{ width: SIDEBAR_WIDTH }}
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-card text-text"
    >
      <div className="flex h-[72px] items-center gap-sm px-md">
        <BrandLogo size={30} />
        <div className="min-w-0">
          <p className="font-sign text-[19px] font-bold leading-none tracking-[-0.01em] [font-stretch:108%]">
            StreetBiz
          </p>
          <p className="mt-1.5 truncate text-body-xs text-muted">{roleLabel}</p>
        </div>
      </div>
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin mx-md mb-sm rounded-[2px]" />

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-sm py-xs">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'relative flex h-11 items-center gap-sm rounded-[10px] px-sm text-body-md transition-colors duration-150',
                isActive
                  ? 'bg-tint-primary font-semibold text-primary-pressed'
                  : 'text-text/75 hover:bg-sunken hover:text-text',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="sb-nav-lit absolute -left-sm top-2.5 h-6 w-[4px] rounded-r-full bg-brand"
                  />
                ) : null}
                <Icon
                  name={item.icon}
                  size={20}
                  color="currentColor"
                  weight={isActive ? 'fill' : 'regular'}
                />
                <span className="truncate">{item.label}</span>
                <NavBadge count={item.badge} className="ml-auto" />
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
            className="flex items-center gap-sm rounded-[10px] p-xs transition-colors hover:bg-sunken"
          >
            <Avatar name={user.fullName} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-semibold text-text">{user.fullName}</p>
              <p className="truncate text-body-xs text-muted">Tài khoản và bảo mật</p>
            </div>
            <Icon name="cog-outline" size={18} color="currentColor" className="text-muted" />
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
          className="flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 py-xs"
        >
          {({ isActive }) => (
            <>
              <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-150 ${isActive ? 'bg-primary text-on-primary' : 'text-muted'}`}
              >
                <Icon
                  name={item.icon}
                  size={21}
                  color="currentColor"
                  weight={isActive ? 'fill' : 'regular'}
                />
                <NavBadge count={item.badge} className="absolute right-0 top-0 -mr-1.5 -mt-1" />
              </span>
              <span
                className={`max-w-full truncate px-1 text-body-xs ${isActive ? 'font-semibold text-text' : 'text-muted'}`}
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
