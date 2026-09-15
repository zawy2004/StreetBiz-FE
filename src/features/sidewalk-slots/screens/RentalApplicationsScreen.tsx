import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function RentalApplicationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const applications = useMockDb((s) => s.applications).filter(
    (a) => a.vendorId === user?.vendorId,
  );
  const slots = useMockDb((s) => s.slots);

  return (
    <Screen>
      <AppHeader title="Đơn thuê ô" back />
      {applications.length === 0 ? (
        <EmptyState icon="file-document-outline" title="Chưa có đơn thuê nào" />
      ) : (
        applications
          .slice()
          .reverse()
          .map((app) => {
            const slotCodes = app.slotIds
              .map((id) => slots.find((s) => s.id === id)?.slot_code)
              .filter(Boolean)
              .join(', ');
            return (
              <Card
                key={app.id}
                onPress={() => router.push(`/vendor/slots/rental-applications/${app.id}`)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={[typography.headlineSm, { color: colors.text }]}>
                      {slotCodes || '—'}
                    </Text>
                    <Text style={[typography.bodySm, { color: colors.muted }]}>
                      {app.application_type === 'STOREFRONT_ADJACENT'
                        ? 'Ô liền kề mặt tiền'
                        : 'Ô mở'}{' '}
                      · {new Date(app.submitted_at).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <StatusChip code={app.application_status} />
                </View>
              </Card>
            );
          })
      )}
    </Screen>
  );
}
