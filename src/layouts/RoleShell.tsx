import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { BrandLogo } from '@/components/common';
import { RoleTabBar, type RoleTabItem } from '@/components/layout/RoleTabBar';
import { ScreenFooterProvider } from '@/components/layout/screen-footer';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { isLiveApi } from '@/core/config/env';
import { RoleGuard } from '@/core/auth/RoleGuard';
import { ScreenFallback } from '@/core/routing/ScreenFallback';
import type { RoleCode } from '@/core/types/role';
import { useChatAlerts } from '@/features/chat/alerts/useChatAlerts';
import { useCanChat, useChatUnreadCount } from '@/features/chat/hooks/useChat';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useVendorOrderAlerts } from '@/features/orders/alerts/useVendorOrderAlerts';
import { useAuthStore } from '@/store/auth-store';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { ConsumerTopNav } from './ConsumerTopNav';
import { CompactFooter } from './CompactFooter';

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
  // New orders are announced on every vendor screen, not only the board: the
  // seller may be editing the menu when a buyer pays.
  const signedInRole = useAuthStore((state) => state.user?.role_code);
  // A role with its own top bar (the vendor) carries the bell there; the others get it
  // in the sidebar on desktop, in the buyer's top nav, or in a slim bar on phones.
  const ownBell = !header && Boolean(signedInRole);
  const newOrders = useVendorOrderAlerts(
    isLiveApi && role === 'VENDOR' && signedInRole === 'VENDOR',
  );
  // New messages likewise, for both sides of a chat - on the shell the person
  // is signed in for, so a seller browsing as a buyer is not alerted twice.
  useChatAlerts(
    useCanChat() && signedInRole === role,
    role === 'VENDOR' ? '/vendor/chat' : '/customer/chat',
  );
  // Buyers get the landing footer, vendors a single quiet line; both only at the end of a screen.
  const screenFooter =
    role === 'CUSTOMER' ? <LandingFooter /> : role === 'VENDOR' ? <CompactFooter /> : null;
  const navItems = useMemo(
    () =>
      items.map((item) =>
        item.to.endsWith('/chat')
          ? { ...item, badge: unreadChat }
          : item.to === '/vendor/orders'
            ? { ...item, badge: newOrders }
            : item,
      ),
    [items, unreadChat, newOrders],
  );

  return (
    <RoleGuard role={role} allowGuest={allowGuest}>
      {/* data-surface picks the role variant of the design system (heading face, density).
          relative + overflow-hidden: absolutely positioned descendants (sr-only labels inside
          the screen's scroller) would otherwise anchor to the page and make the document
          taller than the viewport, so an overscroll drags the whole shell up. */}
      <div
        data-surface={role}
        className={
          sideNav
            ? 'relative flex h-screen overflow-hidden bg-bg'
            : 'relative flex h-screen flex-col overflow-hidden bg-bg'
        }
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-md focus:top-md focus:z-[70] focus:rounded-[12px] focus:bg-card focus:px-md focus:py-sm focus:text-label focus:font-semibold focus:text-text focus:shadow-sheet focus:ring-2 focus:ring-primary"
        >
          Bỏ qua tới nội dung chính
        </a>
        {sideNav ? <RoleTabBar roleLabel={roleLabel} items={navItems} bell={ownBell} /> : null}
        {topNav ? <ConsumerTopNav items={navItems} /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {header}
          {!isDesktop && ownBell ? <PhoneTopBar roleLabel={roleLabel} /> : null}
          <OfflineNote />
          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-hidden outline-none"
          >
            {/* Screens are lazy chunks; only the content area waits, the navigation stays. */}
            <ScreenFooterProvider value={screenFooter}>
              <Suspense fallback={<ScreenFallback />}>
                <Outlet />
              </Suspense>
            </ScreenFooterProvider>
          </main>
        </div>
        {!isDesktop ? <RoleTabBar roleLabel={roleLabel} items={navItems} /> : null}
      </div>
    </RoleGuard>
  );
}

/** Phones have no sidebar or top nav, so the bell needs a bar of its own above the screen. */
function PhoneTopBar({ roleLabel }: { roleLabel: string }) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-xs border-b border-border bg-card/95 px-md backdrop-blur">
      <BrandLogo size={26} />
      <div className="min-w-0 flex-1">
        <p className="font-sign text-[17px] font-bold leading-none tracking-[-0.01em] text-text [font-stretch:108%]">
          StreetBiz
        </p>
        <p className="mt-1 truncate text-body-xs text-muted">{roleLabel}</p>
      </div>
      <NotificationBell variant="ghost" />
    </header>
  );
}

/**
 * Field users lose signal often. Say so plainly while the browser reports it is
 * offline; nothing is blocked or retried here, the screens keep their own errors.
 */
function OfflineNote() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (online) return null;
  return (
    <p
      aria-live="polite"
      className="shrink-0 border-b border-[#6B4100]/15 bg-[#FFF3D1] px-md py-xs text-center text-body-sm font-semibold text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]"
    >
      Bạn đang ngoại tuyến. Các thao tác cần máy chủ sẽ không thực hiện được.
    </p>
  );
}
