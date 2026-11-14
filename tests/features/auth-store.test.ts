import { beforeEach, describe, expect, it } from 'vitest';

import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

// The tests run in mock mode (VITE_USE_MOCK_API=true): the store signs in against the demo users.
beforeEach(() => {
  useAuthStore.setState({ user: null, sessionExpired: true });
  for (const u of useMockDb.getState().users) useMockDb.getState().setAccountStatus(u.id, 'ACTIVE');
});

describe('auth store (mock mode)', () => {
  it('signs a demo user in by phone and password and clears the expired-session notice', async () => {
    await useAuthStore.getState().signIn('0905000002', '123456');

    expect(useAuthStore.getState().user?.role_code).toBe('VENDOR');
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('matches the phone digits whatever formatting the user typed', async () => {
    await useAuthStore.getState().signIn('0905 000 004', '123456');

    expect(useAuthStore.getState().user?.role_code).toBe('WARD_AUTHORITY');
  });

  it('refuses a wrong password and an unknown phone with Vietnamese messages', async () => {
    await expect(useAuthStore.getState().signIn('0905000002', 'sai')).rejects.toThrow('Mật khẩu không đúng.');
    await expect(useAuthStore.getState().signIn('0999999999', '123456')).rejects.toThrow(/Không tìm thấy tài khoản/);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('refuses a suspended account, by password or by OTP', async () => {
    const vendor = useMockDb.getState().users.find((u) => u.phone === '0905000003')!;
    useMockDb.getState().setAccountStatus(vendor.id, 'SUSPENDED');

    await expect(useAuthStore.getState().signIn('0905000003', '123456')).rejects.toThrow(/tạm khoá/);
    await expect(useAuthStore.getState().signInWithOtp('0905000003', '123456')).rejects.toThrow(/tạm khoá/);
  });

  it('signs in with an OTP by phone alone', async () => {
    await useAuthStore.getState().signInWithOtp('0905000001', '123456');

    expect(useAuthStore.getState().user?.role_code).toBe('CUSTOMER');
  });

  it('registration creates an active account and lands it signed in', async () => {
    const created = await useAuthStore.getState().register({
      phoneNumber: '0905777888',
      password: 'Str0ng!Pass',
      fullName: 'Chị Lan',
      roleCode: 'VENDOR',
      wardUnitId: 10,
      otp: '123456',
    });

    expect(created.account_status).toBe('ACTIVE');
    expect(useAuthStore.getState().user).toEqual(created);
    expect(useMockDb.getState().users.some((u) => u.phone === '0905777888')).toBe(true);
  });

  it('registration without a name falls back to the phone as the display name', async () => {
    const created = await useAuthStore.getState().register({ phoneNumber: '0905777999', password: 'Str0ng!Pass', fullName: null, roleCode: 'CUSTOMER', wardUnitId: null, otp: '123456' });

    expect(created.fullName).toBe('0905777999');
  });

  it('signing out drops the user', async () => {
    await useAuthStore.getState().signIn('0905000002', '123456');
    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('the demo role switcher jumps to the first account of that role', () => {
    useAuthStore.getState().switchRoleDemo('PLATFORM_ADMIN');
    expect(useAuthStore.getState().user?.phone).toBe('0905000005');

    useAuthStore.getState().switchRoleDemo('NOT_A_ROLE' as never);
    expect(useAuthStore.getState().user?.phone).toBe('0905000005');
  });

  it('only the user survives in local storage, not the transient notice', async () => {
    await useAuthStore.getState().signIn('0905000002', '123456');
    useAuthStore.setState({ sessionExpired: true });

    const stored = JSON.parse(localStorage.getItem('streetbiz-auth') ?? '{}');
    expect(stored.state.user.phone).toBe('0905000002');
    expect(stored.state.sessionExpired).toBeUndefined();
  });

  it('setUser and clearSessionExpired update exactly their field', () => {
    const user = useMockDb.getState().users[0]!;
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().clearSessionExpired();

    expect(useAuthStore.getState()).toMatchObject({ user, sessionExpired: false });
  });
});
