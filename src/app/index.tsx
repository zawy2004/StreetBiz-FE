import { Redirect } from 'expo-router';

import { GUEST_HOME_ROUTE, ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { useAuthStore } from '@/store/auth-store';

export default function IndexScreen() {
  const user = useAuthStore((s) => s.user);
  const href = user ? ROLE_HOME_ROUTE[user.role_code] : GUEST_HOME_ROUTE;

  return <Redirect href={href as never} />;
}
