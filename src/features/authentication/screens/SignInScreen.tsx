import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { PasswordField, PhoneField } from '@/components/forms';
import { isDev } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuthStore } from '@/store/auth-store';

const DEMO_ROLES: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

export function SignInScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const switchRoleDemo = useAuthStore((s) => s.switchRoleDemo);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    const result = signIn(phone, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const user = useAuthStore.getState().user;
    if (user) router.replace(ROLE_HOME_ROUTE[user.role_code] as never);
  };

  return (
    <AuthShell
      title="Đăng nhập StreetBiz"
      subtitle="Quản lý kinh doanh vỉa hè, minh bạch và đơn giản"
    >
      <PhoneField value={phone} onChangeText={setPhone} />
      <PasswordField value={password} onChangeText={setPassword} error={error} />
      <Link href="/auth/password/reset-request" asChild>
        <Pressable>
          <Text style={[typography.label, { color: colors.primary, textAlign: 'right' }]}>
            Quên mật khẩu?
          </Text>
        </Pressable>
      </Link>
      <Button label="Đăng nhập" onPress={submit} />
      <Link href="/auth/register" asChild>
        <Pressable>
          <Text style={[typography.bodyMd, { color: colors.muted, textAlign: 'center' }]}>
            Chưa có tài khoản? <Text style={{ color: colors.primary }}>Đăng ký ngay</Text>
          </Text>
        </Pressable>
      </Link>

      {isDev ? (
        <View style={styles.demoBox}>
          <Text style={[typography.label, { color: colors.muted, marginBottom: spacing.xs }]}>
            TÀI KHOẢN DEMO (chỉ hiện ở môi trường dev)
          </Text>
          <View style={{ gap: spacing.xs }}>
            {DEMO_ROLES.map((role) => (
              <Pressable
                key={role}
                onPress={() => {
                  switchRoleDemo(role);
                  router.replace(ROLE_HOME_ROUTE[role] as never);
                }}
                style={styles.demoRow}
              >
                <Text style={[typography.bodyMd, { color: colors.text }]}>{ROLE_LABELS[role]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  demoBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  demoRow: {
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
