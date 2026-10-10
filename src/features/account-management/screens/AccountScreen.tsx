import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { ConfirmDialog } from '@/components/feedback';
import { isDev, isLiveApi } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import type { RoleCode } from '@/core/types/role';
import { useAuthStore } from '@/store/auth-store';
import {
  AccountIdentityPlate,
  RoleDemoStrip,
  SecurityTile,
  SignOutZone,
  ThemePreviewPicker,
} from '../components/AccountParts';
import '../account.css';

const DEMO_ROLES: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-heading text-[19px] font-bold leading-6 text-text">
      {children}
    </h2>
  );
}

export function AccountScreen() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const switchRoleDemo = useAuthStore((s) => s.switchRoleDemo);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!user) return null;

  const doSignOut = async () => {
    // signOut revokes the session on the backend, then clears the local tokens.
    await signOut();
    setConfirmSignOut(false);
    navigate('/auth/sign-in', { replace: true });
  };

  // `/account` has no shell (ward officers, admins), so it gets its own way home.
  const bare = pathname === '/account';

  return (
    <Screen>
      <AppHeader
        title="Tài khoản"
        right={
          bare ? (
            <Link
              to={ROLE_HOME_ROUTE[user.role_code]}
              className="inline-flex h-12 items-center gap-xs rounded-[12px] bg-card px-md text-label font-semibold text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken"
            >
              <Icon name="arrow-left" size={18} color="currentColor" />
              Về trang chủ
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 items-start gap-lg [@container_(min-width:960px)]:grid-cols-[376px_minmax(0,1fr)] [@container_(min-width:960px)]:grid-rows-[auto_1fr] [@container_(min-width:960px)]:gap-x-xl">
        <div className="[@container_(min-width:960px)]:col-start-1 [@container_(min-width:960px)]:row-start-1">
          <AccountIdentityPlate
            fullName={user.fullName}
            role={user.role_code}
            phone={user.phone}
            suspended={user.account_status === 'SUSPENDED'}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-xl [@container_(min-width:960px)]:col-start-2 [@container_(min-width:960px)]:row-span-2 [@container_(min-width:960px)]:row-start-1">
          <section aria-labelledby="account-security" className="flex flex-col gap-sm">
            <SectionTitle id="account-security">Bảo mật</SectionTitle>
            <div className="grid grid-cols-1 gap-sm [@container_(min-width:560px)]:grid-cols-3">
              <SecurityTile
                icon="lock-outline"
                title="Đổi mật khẩu"
                description="Dùng mật khẩu riêng cho StreetBiz"
                onPress={() => navigate('/account/password')}
              />
              <SecurityTile
                icon="devices"
                title="Phiên đăng nhập"
                description="Xem và đăng xuất thiết bị lạ"
                onPress={() => navigate('/account/sessions')}
              />
              <SecurityTile
                icon="bell-outline"
                title="Thông báo"
                description="Phí, hồ sơ, đơn hàng và kết quả duyệt"
                onPress={() => navigate('/account/notifications')}
              />
            </div>
          </section>

          <section aria-labelledby="account-theme" className="flex flex-col gap-sm">
            <div className="flex flex-col gap-0.5">
              <SectionTitle id="account-theme">Giao diện</SectionTitle>
              <p className="text-body-sm text-muted">
                Chế độ tối dịu mắt hơn khi bán hàng buổi tối.
              </p>
            </div>
            <ThemePreviewPicker />
          </section>

          {isDev && !isLiveApi ? (
            <section aria-labelledby="account-demo" className="flex flex-col gap-sm">
              <SectionTitle id="account-demo">Đổi vai trò (demo)</SectionTitle>
              <RoleDemoStrip
                roles={DEMO_ROLES}
                current={user.role_code}
                onPick={(role) => {
                  switchRoleDemo(role);
                  navigate(ROLE_HOME_ROUTE[role], { replace: true });
                }}
              />
            </section>
          ) : null}
        </div>

        <div className="[@container_(min-width:960px)]:col-start-1 [@container_(min-width:960px)]:row-start-2">
          <SignOutZone onPress={() => setConfirmSignOut(true)} />
        </div>
      </div>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Đăng xuất khỏi StreetBiz?"
        description="Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng."
        confirmLabel="Đăng xuất"
        confirmVariant="danger"
        onConfirm={doSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
