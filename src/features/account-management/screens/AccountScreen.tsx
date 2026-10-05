import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Avatar, Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { AppHeader, Screen, Section, ThemeToggle } from '@/components/layout';
import { ConfirmDialog } from '@/components/feedback';
import { isDev, isLiveApi } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { colors } from '@/theme';
import { useAuthStore } from '@/store/auth-store';

const DEMO_ROLES: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

export function AccountScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const switchRoleDemo = useAuthStore((s) => s.switchRoleDemo);
  const queryClient = useQueryClient();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const doSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // signOut revokes the session on the backend, then clears the local tokens.
      await signOut();
    } finally {
      // Cached lists belong to the account that just left; the next sign-in must not see them.
      queryClient.clear();
      setSigningOut(false);
      setConfirmSignOut(false);
    }
    navigate('/auth/sign-in', { replace: true });
  };

  return (
    <Screen width="narrow">
      <AppHeader title="Tài khoản" back={user.role_code === 'WARD_AUTHORITY' || user.role_code === 'PLATFORM_ADMIN'} />
      <Card>
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} size={56} />
          <div className="flex-1">
            <ListRow
              title={user.fullName}
              subtitle={`${ROLE_LABELS[user.role_code]} · ${user.phone}`}
            />
          </div>
        </div>
      </Card>

      <Section title="Giao diện" description="Chế độ tối dịu mắt hơn khi bán hàng buổi tối.">
        <Card>
          <ThemeToggle />
        </Card>
      </Section>

      <Section title="Bảo mật">
        <Card padded={false}>
          <div className="px-md">
            <ListRow
              title="Đổi mật khẩu"
              leading={<Icon name="lock-outline" size={20} color={colors.muted} />}
              showChevron
              onPress={() => navigate('/account/password')}
            />
            <Divider />
            <ListRow
              title="Phiên đăng nhập"
              leading={<Icon name="devices" size={20} color={colors.muted} />}
              showChevron
              onPress={() => navigate('/account/sessions')}
            />
            <Divider />
            <ListRow
              title="Lịch sử đăng nhập"
              leading={<Icon name="shield-outline" size={20} color={colors.muted} />}
              showChevron
              onPress={() => navigate('/account/security-history')}
            />
            <Divider />
            <ListRow
              title="Thông báo"
              leading={<Icon name="bell-outline" size={20} color={colors.muted} />}
              showChevron
              onPress={() => navigate('/account/notifications')}
            />
          </div>
        </Card>
      </Section>

      {isDev && !isLiveApi ? (
        <Section title="Đổi vai trò (demo)">
          <Card padded={false}>
            <div className="px-md">
              {DEMO_ROLES.map((role, i) => (
                <div key={role}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={ROLE_LABELS[role]}
                    showChevron
                    onPress={() => {
                      switchRoleDemo(role);
                      navigate(ROLE_HOME_ROUTE[role], { replace: true });
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Section>
      ) : null}

      <Button label="Đăng xuất" variant="outline" onPress={() => setConfirmSignOut(true)} />

      <ConfirmDialog
        visible={confirmSignOut}
        title="Đăng xuất khỏi StreetBiz?"
        description="Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng."
        confirmLabel="Đăng xuất"
        confirmVariant="danger"
        loading={signingOut}
        onConfirm={doSignOut}
        onCancel={() => {
          if (!signingOut) setConfirmSignOut(false);
        }}
      />
    </Screen>
  );
}
