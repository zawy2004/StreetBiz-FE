import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Avatar, Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { ConfirmDialog } from '@/components/feedback';
import { isDev } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { colors } from '@/theme';
import { useAuthStore } from '@/store/auth-store';
import { useState } from 'react';

const DEMO_ROLES: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

export function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const switchRoleDemo = useAuthStore((s) => s.switchRoleDemo);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!user) return null;

  const doSignOut = () => {
    signOut();
    setConfirmSignOut(false);
    router.replace('/auth/sign-in');
  };

  return (
    <Screen>
      <AppHeader title="Tài khoản" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={user.fullName} size={56} />
          <View style={{ flex: 1 }}>
            <ListRow
              title={user.fullName}
              subtitle={`${ROLE_LABELS[user.role_code]} · ${user.phone}`}
            />
          </View>
        </View>
      </Card>

      <Section title="Bảo mật">
        <Card padded={false}>
          <View style={{ paddingHorizontal: 16 }}>
            <ListRow
              title="Đổi mật khẩu"
              leading={
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.muted} />
              }
              showChevron
              onPress={() => router.push('/account/password')}
            />
            <Divider />
            <ListRow
              title="Phiên đăng nhập"
              leading={<MaterialCommunityIcons name="devices" size={20} color={colors.muted} />}
              showChevron
              onPress={() => router.push('/account/sessions')}
            />
            <Divider />
            <ListRow
              title="Thông báo"
              leading={
                <MaterialCommunityIcons name="bell-outline" size={20} color={colors.muted} />
              }
              showChevron
              onPress={() => router.push('/account/notifications')}
            />
          </View>
        </Card>
      </Section>

      {isDev ? (
        <Section title="Đổi vai trò (demo)">
          <Card padded={false}>
            <View style={{ paddingHorizontal: 16 }}>
              {DEMO_ROLES.map((role, i) => (
                <View key={role}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={ROLE_LABELS[role]}
                    showChevron
                    onPress={() => {
                      switchRoleDemo(role);
                      router.replace(ROLE_HOME_ROUTE[role] as never);
                    }}
                  />
                </View>
              ))}
            </View>
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
        onConfirm={doSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
