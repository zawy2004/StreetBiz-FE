import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { RoleTabBar, type RoleTabItem } from '@/components/layout/RoleTabBar';
import { RoleGuard } from '@/core/auth/RoleGuard';
import type { RoleCode } from '@/core/types/role';
import { useIsDesktop } from '@/hooks/useBreakpoint';

type Props = {
  role: RoleCode;
  allowGuest?: boolean;
  roleLabel: string;
  items: RoleTabItem[];
  /** Rendered above the routed screen, inside the guard. Only roles that pass one get a top bar. */
  header?: ReactNode;
};

/** Wraps a role's route subtree with its access guard and responsive tab bar. */
export function RoleShell({ role, allowGuest, roleLabel, items, header }: Props) {
  const isDesktop = useIsDesktop();

  return (
    <RoleGuard role={role} allowGuest={allowGuest}>
      <div className={isDesktop ? 'flex h-screen' : 'flex h-screen flex-col'}>
        {isDesktop ? <RoleTabBar roleLabel={roleLabel} items={items} /> : null}
        {header ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {header}
            <div className="min-h-0 flex-1 overflow-hidden">
              <Outlet />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </div>
        )}
        {!isDesktop ? <RoleTabBar roleLabel={roleLabel} items={items} /> : null}
      </div>
    </RoleGuard>
  );
}
