import { useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { View, Text } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useNewRegistrationStore } from '../new-registration-store';

export function RegistrationsListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const registrations = useMockDb((s) => s.registrations).filter(
    (r) => r.vendorId === user?.vendorId,
  );
  const reset = useNewRegistrationStore((s) => s.reset);

  return (
    <Screen
      footer={
        <View style={{ padding: spacing.md }}>
          <Button
            label="Đăng ký kinh doanh mới"
            onPress={() => {
              reset();
              router.push('/vendor/registrations/new/type');
            }}
          />
        </View>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      {registrations.length === 0 ? (
        <EmptyState icon="file-document-outline" title="Chưa có hồ sơ đăng ký" />
      ) : (
        registrations.map((r) => (
          <Card key={r.id} onPress={() => router.push(`/vendor/registrations/${r.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[typography.headlineSm, { color: colors.text }]}>
                  {r.business_name}
                </Text>
                <Text style={[typography.bodyMd, { color: colors.muted }]}>
                  {r.vendor_type === 'FIXED_STOREFRONT' ? 'Cửa hàng cố định' : 'Bán hàng lưu động'}
                </Text>
              </View>
              <StatusChip code={r.registration_status} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
