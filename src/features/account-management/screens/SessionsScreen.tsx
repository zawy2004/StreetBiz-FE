import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card, Divider, IconButton, ListRow } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function SessionsScreen() {
  const user = useAuthStore((s) => s.user);
  const sessions = useMockDb((s) => s.sessions).filter((sess) => sess.userId === user?.id);
  const revokeSession = useMockDb((s) => s.revokeSession);

  return (
    <Screen>
      <AppHeader title="Phiên đăng nhập" back subtitle="Thiết bị đang truy cập tài khoản của bạn" />
      {sessions.length === 0 ? (
        <EmptyState icon="devices" title="Không có phiên nào khác" />
      ) : (
        <Card padded={false}>
          <View style={{ paddingHorizontal: 16 }}>
            {sessions.map((sess, i) => (
              <View key={sess.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={sess.device}
                  subtitle={`${sess.location} · Hoạt động gần nhất ${new Date(sess.last_active).toLocaleString('vi-VN')}`}
                  leading={<MaterialCommunityIcons name="laptop" size={20} color={colors.muted} />}
                  trailing={
                    sess.current ? (
                      <StatusChip label="Đang dùng" tone="ok" />
                    ) : (
                      <IconButton
                        icon="close-circle-outline"
                        accessibilityLabel="Đăng xuất thiết bị"
                        color={colors.error}
                        onPress={() => revokeSession(sess.id)}
                      />
                    )
                  }
                />
              </View>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}
