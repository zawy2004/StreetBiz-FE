import type { RoleCode } from '@/core/types/role';

/** Landing route for each role right after sign-in / app launch. */
export const ROLE_HOME_ROUTE: Record<RoleCode, string> = {
  CUSTOMER: '/customer/explore',
  VENDOR: '/vendor/home',
  WARD_AUTHORITY: '/ward/dashboard',
  PLATFORM_ADMIN: '/platform/dashboard',
};

export const GUEST_HOME_ROUTE = '/customer/explore';

/**
 * Where to go after signing in: the page the user was sent away from, but only if it belongs to
 * their own role (or the shared account area), so a link to someone else's area cannot bounce them.
 */
export function resolveReturnTo(from: unknown, role: RoleCode): string {
  const home = ROLE_HOME_ROUTE[role];
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return home;
  const area = '/' + (home.split('/')[1] ?? '');
  return from === area || from.startsWith(area + '/') || from.startsWith('/account') ? from : home;
}
