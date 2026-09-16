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
};

/** Wraps a role's route subtree with its access guard and responsive tab bar. */
export function RoleShell({ role, allowGuest, roleLabel, items }: Props) {
  const isDesktop = useIsDesktop();

  return (
    <RoleGuard role={role} allowGuest={allowGuest}>
      <div className={isDesktop ? 'flex h-screen' : 'flex h-screen flex-col'}>
        {isDesktop ? <RoleTabBar roleLabel={roleLabel} items={items} /> : null}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
        {!isDesktop ? <RoleTabBar roleLabel={roleLabel} items={items} /> : null}
      </div>
    </RoleGuard>
  );
}
