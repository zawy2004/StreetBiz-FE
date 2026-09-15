import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card, Divider } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const notifications = useMockDb((s) => s.notifications)
    .filter((n) => n.userId === user?.id)
    .slice()
    .reverse();
  const markRead = useMockDb((s) => s.markNotificationRead);

  return (
    <Screen>
      <AppHeader title="Thông báo" back />
      {notifications.length === 0 ? (
        <EmptyState icon="bell-outline" title="Chưa có thông báo" />
      ) : (
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            {notifications.map((n, i) => (
              <View key={n.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => markRead(n.id)}
                  style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm }}
                >
                  <MaterialCommunityIcons
                    name={n.read ? 'bell-outline' : 'bell-ring'}
                    size={20}
                    color={n.read ? colors.muted : colors.primary}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[typography.headlineSm, { color: colors.text }]}>{n.title}</Text>
                    <Text style={[typography.bodyMd, { color: colors.muted }]}>{n.body}</Text>
                  </View>
                  {!n.read ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.primary,
                        marginTop: 6,
                      }}
                    />
                  ) : null}
                </Pressable>
              </View>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}
