import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  authApi,
  clearTokens,
  getTokens,
  setSessionExpiredHandler,
  setTokens,
  type ApiUser,
  type AuthResult,
  type RegisterPayload,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import type { MockUser } from '@/mocks/types';
import type { RoleCode } from '@/core/types/role';

/**
 * Maps a backend UserDto onto the MockUser shape the rest of the app renders.
 * Keeping one user shape means the screens that are still mock-backed keep
 * working while Authentication and Vendor Onboarding talk to StreetBiz-BE.
 *
 * `password` is never returned by the API and is only meaningful in mock mode.
 */
function toAppUser(apiUser: ApiUser): MockUser {
  return {
    id: String(apiUser.userId),
    fullName: apiUser.fullName ?? apiUser.phoneNumber,
    phone: apiUser.phoneNumber,
    password: '',
    role_code: apiUser.roleCode,
    wardUnitId: apiUser.wardUnitId ?? undefined,
    account_status: apiUser.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
  };
}

type AuthState = {
  user: MockUser | null;
  /** Set when a refresh failed, so the sign-in screen can explain why. */
  sessionExpired: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<MockUser>;
  signOut: () => Promise<void>;
  setUser: (user: MockUser) => void;
  clearSessionExpired: () => void;
  /** Dev-only: jump straight to the first demo account for a role (mock mode). */
  switchRoleDemo: (role: RoleCode) => void;
};

function applyAuthResult(result: AuthResult): MockUser {
  setTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpiresAtUtc: result.accessTokenExpiresAtUtc,
  });
  return toAppUser(result.user);
}

/** Mock sign-in kept for the offline demo path (VITE_USE_MOCK_API=true). */
function mockSignIn(phone: string, password: string): MockUser {
  const normalized = phone.replace(/\D/g, '');
  const match = useMockDb.getState().users.find((u) => u.phone.replace(/\D/g, '') === normalized);
  if (!match) throw new Error('Không tìm thấy tài khoản với số điện thoại này.');
  if (match.password !== password) throw new Error('Mật khẩu không đúng.');
  if (match.account_status === 'SUSPENDED') {
    throw new Error('Tài khoản đã bị tạm khoá. Vui lòng liên hệ quản trị viên.');
  }
  return match;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionExpired: false,

      signIn: async (phone, password) => {
        if (!isLiveApi) {
          set({ user: mockSignIn(phone, password), sessionExpired: false });
          return;
        }
        const result = await authApi.login(phone, password);
        set({ user: applyAuthResult(result), sessionExpired: false });
      },

      /**
       * Creates the account but deliberately does NOT start a session: the app
       * sends the new user to the sign-in screen to enter the password they just
       * chose.
       *
       * `POST /auth/register` (AUTH-01) signs the account in and hands back a
       * live access/refresh pair regardless, so that session is revoked here
       * rather than dropped on the floor - otherwise a usable refresh token
       * would sit on the server for its full 30-day life with nobody holding it.
       */
      register: async (payload) => {
        if (!isLiveApi) {
          const created = useMockDb.getState().registerUser({
            fullName: payload.fullName ?? payload.phoneNumber,
            phone: payload.phoneNumber,
            password: payload.password,
            role_code: payload.roleCode,
            account_status: 'ACTIVE',
          });
          set({ user: null, sessionExpired: false });
          return created;
        }

        const result = await authApi.register(payload);
        // Hold the tokens just long enough to authenticate the logout call.
        applyAuthResult(result);
        try {
          await authApi.logout();
        } catch {
          /* best effort: the account exists either way, and the token expires */
        }
        clearTokens();
        set({ user: null, sessionExpired: false });
        return toAppUser(result.user);
      },

      signOut: async () => {
        if (isLiveApi) {
          // Best effort: an expired or already-revoked session must not trap
          // the user in a signed-in UI, so a failure here is not surfaced.
          try {
            await authApi.logout();
          } catch {
            /* ignore */
          }
          clearTokens();
        }
        set({ user: null, sessionExpired: false });
      },

      setUser: (user) => set({ user }),
      clearSessionExpired: () => set({ sessionExpired: false }),

      switchRoleDemo: (role) => {
        const match = useMockDb.getState().users.find((u) => u.role_code === role);
        if (match) set({ user: match, sessionExpired: false });
      },
    }),
    {
      name: 'streetbiz-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

// A user persisted without tokens (e.g. a demo account left over from mock mode)
// would look signed in while every API call fails, so drop it. localStorage
// hydrates synchronously, but handle the async case too.
function dropTokenlessUser() {
  if (isLiveApi && useAuthStore.getState().user && !getTokens()) {
    useAuthStore.setState({ user: null });
  }
}
if (useAuthStore.persist.hasHydrated()) dropTokenlessUser();
else useAuthStore.persist.onFinishHydration(dropTokenlessUser);

// When the refresh token is rejected, drop the user so RoleGuard routes to
// sign-in and the screen can explain that the session expired.
setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, sessionExpired: true });
});
