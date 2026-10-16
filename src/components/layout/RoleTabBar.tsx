import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { Avatar, BrandLogo, Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth-store';
import { ThemeToggle } from './ThemeToggle';

export const SIDEBAR_WIDTH = 248;

export type RoleTabChild = {
  to: string;
  label: string;
  /**
   * Extra path prefixes that count as this entry, e.g. the detail screens a list
   * opens. Without any, the entry is lit for the paths under the parent that no
   * sibling claims (the parent's overview).
   */
  match?: string[];
};

export type RoleTabItem = {
  to: string;
  label: string;
  icon: IconName;
  /** Unread count shown on the tab; omitted or 0 renders nothing. */
  badge?: number;
  /** Desktop sidebar only: a group that folds out under the entry. Phones keep the single tab. */
  children?: RoleTabChild[];
};

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Which child of a group the current path belongs to, if any. */
function activeChild(path: string, children: RoleTabChild[]): string | undefined {
  const claimed = children.find((c) => c.match && [c.to, ...c.match].some((m) => under(path, m)));
  return (claimed ?? children.find((c) => !c.match))?.to;
}

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
  /** Put the notification bell in the sidebar header (roles without a top bar of their own). */
  bell?: boolean;
};

/**
 * Role navigation: on desktop (>=1024px) a bright board down the left — ink
 * lettering, the current place lit in a soft orange with the brand bar beside
 * it, like the lit name on a route sign; on phones and tablets a bottom tab bar. Active state comes
 * from ordinary route matching via react-router's NavLink.
 */
export function RoleTabBar({ roleLabel, items, bell }: Props) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <Sidebar roleLabel={roleLabel} items={items} bell={bell} />
  ) : (
    <BottomTabBar items={items} />
  );
}

function Sidebar({ roleLabel, items, bell }: Props) {
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
        <div className="min-w-0 flex-1">
          <p className="font-sign text-[19px] font-bold leading-none tracking-[-0.01em] [font-stretch:108%]">
            StreetBiz
          </p>
          <p className="mt-1.5 truncate text-body-xs text-muted">{roleLabel}</p>
        </div>
        {bell && user ? <NotificationBell align="left" variant="ghost" /> : null}
      </div>
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin mx-md mb-sm rounded-[2px]" />

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-sm py-xs">
        {navItems.map((item) =>
          item.children?.length ? (
            <NavGroup key={item.to} item={item} entries={item.children} />
          ) : (
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
          ),
        )}
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

/** A sidebar entry that folds out its sub-pages; open while the person is inside it. */
function NavGroup({ item, entries }: { item: RoleTabItem; entries: RoleTabChild[] }) {
  const { pathname } = useLocation();
  const inside = under(pathname, item.to);
  // null = follow the route; a click pins it open or shut until the route moves.
  const [pinned, setPinned] = useState<{ open: boolean; path: string } | null>(null);
  const open = pinned && pinned.path === pathname ? pinned.open : inside;
  const current = inside ? activeChild(pathname, entries) : undefined;
  const groupId = `nav-group-${item.to.replace(/\W+/g, '-')}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={groupId}
        onClick={() => setPinned({ open: !open, path: pathname })}
        className={[
          'relative flex h-11 w-full items-center gap-sm rounded-[10px] px-sm text-left text-body-md transition-colors duration-150',
          inside
            ? 'bg-tint-primary font-semibold text-primary-pressed'
            : 'text-text/75 hover:bg-sunken hover:text-text',
        ].join(' ')}
      >
        {inside ? (
          <span
            aria-hidden="true"
            className="sb-nav-lit absolute -left-sm top-2.5 h-6 w-[4px] rounded-r-full bg-brand"
          />
        ) : null}
        <Icon
          name={item.icon}
          size={20}
          color="currentColor"
          weight={inside ? 'fill' : 'regular'}
        />
        <span className="truncate">{item.label}</span>
        <NavBadge count={item.badge} className="ml-auto" />
        <Icon
          name="chevron-down"
          size={16}
          color="currentColor"
          className={`${item.badge ? '' : 'ml-auto'} shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <ul
          id={groupId}
          className="mb-1 ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-border pl-sm"
        >
          {entries.map((child) => {
            const isCurrent = current === child.to;
            return (
              <li key={child.to}>
                <Link
                  to={child.to}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={[
                    'flex h-9 items-center rounded-[8px] px-sm text-body-sm transition-colors duration-150',
                    isCurrent
                      ? 'bg-tint-primary font-semibold text-primary-pressed'
                      : 'text-text/70 hover:bg-sunken hover:text-text',
                  ].join(' ')}
                >
                  <span className="truncate">{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
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
