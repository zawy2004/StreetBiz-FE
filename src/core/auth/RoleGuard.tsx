import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/store/auth-store';
import type { RoleCode } from '@/core/types/role';
import { ROLE_HOME_ROUTE } from './role-routes';

type Props = {
  role: RoleCode;
  /** Allow an unauthenticated guest to view this group (browse-only screens still gate actions). */
  allowGuest?: boolean;
  children: ReactNode;
};

/** Keeps a role-scoped route group restricted to its role (per role-permission-matrix.md). */
export function RoleGuard({ role, allowGuest, children }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    if (allowGuest) return <>{children}</>;
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (user.role_code !== role) {
    return <Navigate to={ROLE_HOME_ROUTE[user.role_code]} replace />;
  }

  return <>{children}</>;
}
