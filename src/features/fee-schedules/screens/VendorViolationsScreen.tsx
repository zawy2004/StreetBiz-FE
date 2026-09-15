import { Text, View } from 'react-native';

import { Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function VendorViolationsScreen() {
  const user = useAuthStore((s) => s.user);
  const violations = useMockDb((s) => s.violations).filter((v) => v.vendorId === user?.vendorId);

  return (
    <Screen>
      <AppHeader title="Lịch sử vi phạm" back />
      {violations.length === 0 ? (
        <EmptyState icon="shield-check-outline" title="Không có vi phạm nào" />
      ) : (
        violations.map((v) => (
          <Card key={v.id}>
            <Text style={[typography.headlineSm, { color: colors.text }]}>{v.violation_type}</Text>
            <Text style={[typography.bodyMd, { color: colors.muted, marginTop: 4 }]}>{v.note}</Text>
            <View style={{ marginTop: 8 }}>
              <Text style={[typography.bodySm, { color: colors.muted }]}>
                {new Date(v.recorded_at).toLocaleString('vi-VN')}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
