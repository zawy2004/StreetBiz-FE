import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useMockDb } from '@/mocks/db';
import type { MockUser } from '@/mocks/types';
import type { RoleCode } from '@/core/types/role';

type AuthState = {
  user: MockUser | null;
  signIn: (phone: string, password: string) => { ok: true } | { ok: false; error: string };
  signOut: () => void;
  setUser: (user: MockUser) => void;
  /** Dev-only: jump straight to the first demo account for a role. */
  switchRoleDemo: (role: RoleCode) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (phone, password) => {
        const normalized = phone.replace(/\D/g, '');
        const match = useMockDb
          .getState()
          .users.find((u) => u.phone.replace(/\D/g, '') === normalized);
        if (!match) return { ok: false, error: 'Không tìm thấy tài khoản với số điện thoại này.' };
        if (match.password !== password) return { ok: false, error: 'Mật khẩu không đúng.' };
        if (match.account_status === 'SUSPENDED') {
          return { ok: false, error: 'Tài khoản đã bị tạm khoá. Vui lòng liên hệ quản trị viên.' };
        }
        set({ user: match });
        return { ok: true };
      },
      signOut: () => set({ user: null }),
      setUser: (user) => set({ user }),
      switchRoleDemo: (role) => {
        const match = useMockDb.getState().users.find((u) => u.role_code === role);
        if (match) set({ user: match });
      },
    }),
    {
      name: 'streetbiz-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
