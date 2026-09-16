import { GUEST_HOME_ROUTE, ROLE_HOME_ROUTE } from '@/core/auth/role-routes';

describe('role home routes', () => {
  it('maps every role to its own tab-bar root', () => {
    expect(ROLE_HOME_ROUTE.CUSTOMER).toBe('/customer/explore');
    expect(ROLE_HOME_ROUTE.VENDOR).toBe('/vendor/home');
    expect(ROLE_HOME_ROUTE.WARD_AUTHORITY).toBe('/ward/dashboard');
    expect(ROLE_HOME_ROUTE.PLATFORM_ADMIN).toBe('/platform/dashboard');
  });

  it('sends an unauthenticated guest to the public customer experience', () => {
    expect(GUEST_HOME_ROUTE).toBe(ROLE_HOME_ROUTE.CUSTOMER);
  });
});
