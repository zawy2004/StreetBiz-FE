import { Suspense, useMemo, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { RoleTabBar, type RoleTabItem } from '@/components/layout/RoleTabBar';
import { RoleGuard } from '@/core/auth/RoleGuard';
import { ScreenFallback } from '@/core/routing/ScreenFallback';
import type { RoleCode } from '@/core/types/role';
import { useChatUnreadCount } from '@/features/chat/hooks/useChat';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { ConsumerTopNav } from './ConsumerTopNav';

type Props = {
  role: RoleCode;
  allowGuest?: boolean;
  roleLabel: string;
  items: RoleTabItem[];
  /** Rendered above the routed screen, inside the guard. Only roles that pass one get a top bar. */
  header?: ReactNode;
  /**
   * `sidebar` (default) for the management roles; `topnav` for buyers, who get
   * a storefront-style bar on web instead of an admin sidebar.
   */
  navigation?: 'sidebar' | 'topnav';
};

/** Wraps a role's route subtree with its access guard and responsive navigation. */
export function RoleShell({
  role,
  allowGuest,
  roleLabel,
  items,
  header,
  navigation = 'sidebar',
}: Props) {
  const isDesktop = useIsDesktop();
  const topNav = isDesktop && navigation === 'topnav';
  const sideNav = isDesktop && navigation === 'sidebar';

  // Unread messages belong on the navigation, not only inside the inbox: the
  // query is disabled for roles without chat, so this costs them nothing.
  const unreadChat = useChatUnreadCount().data ?? 0;
  const navItems = useMemo(
    () =>
      items.map((item) =>
        item.to.endsWith('/chat') ? { ...item, badge: unreadChat } : item,
      ),
    [items, unreadChat],
  );

  return (
    <RoleGuard role={role} allowGuest={allowGuest}>
      <div className={sideNav ? 'flex h-screen bg-bg' : 'flex h-screen flex-col bg-bg'}>
        {sideNav ? <RoleTabBar roleLabel={roleLabel} items={navItems} /> : null}
        {topNav ? <ConsumerTopNav items={navItems} /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {header}
          <main className="min-h-0 flex-1 overflow-hidden">
            {/* Screens are lazy chunks; only the content area waits, the navigation stays. */}
            <Suspense fallback={<ScreenFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        {!isDesktop ? <RoleTabBar roleLabel={roleLabel} items={navItems} /> : null}
      </div>
    </RoleGuard>
  );
}
