import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/auth-store';
import type { RoleCode } from '@/core/types/role';
import { ROLE_HOME_ROUTE } from './role-routes';

type Props = {
  role: RoleCode;
  /** Allow an unauthenticated guest to view this group (browse-only screens still gate actions). */
  allowGuest?: boolean;
  children: ReactNode;
};

/** Sign-in sends the user back to the page they were sent away from (see `returnTo`). */
function useSignInRedirect() {
  const location = useLocation();
  return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname + location.search }} />;
}

/** Keeps a role-scoped route group restricted to its role (per role-permission-matrix.md). */
export function RoleGuard({ role, allowGuest, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const signInRedirect = useSignInRedirect();

  if (!user) {
    if (allowGuest) return <>{children}</>;
    return signInRedirect;
  }

  if (user.role_code !== role) {
    return <Navigate to={ROLE_HOME_ROUTE[user.role_code]} replace />;
  }

  return <>{children}</>;
}

/**
 * Requires a signed-in account of any role, for shared account-management
 * screens (change password, sessions, notifications) that aren't role-scoped.
 * Without this, an unauthenticated visitor hitting e.g. /account/sessions
 * either sees a blank screen or a confusing "session expired" error instead of
 * being sent to sign in.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const signInRedirect = useSignInRedirect();
  return user ? <>{children}</> : signInRedirect;
}

/** For the sign-in / register screens: someone already signed in has no business there. */
export function GuestOnlyGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <Navigate to={ROLE_HOME_ROUTE[user.role_code]} replace /> : <>{children}</>;
}
