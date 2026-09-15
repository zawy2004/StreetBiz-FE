import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, IconButton } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function PlatformDashboardScreen() {
  const router = useRouter();
  const users = useMockDb((s) => s.users);
  const vendors = useMockDb((s) => s.vendors);
  const storefronts = useMockDb((s) => s.storefronts);
  const orders = useMockDb((s) => s.orders);
  const reportedContent = useMockDb((s) => s.reportedContent);

  const stats = [
    { label: 'Tổng tài khoản', value: `${users.length}` },
    { label: 'Hộ kinh doanh', value: `${vendors.length}` },
    {
      label: 'Gian hàng đang mở',
      value: `${storefronts.filter((s) => s.availability_status === 'OPEN').length}`,
    },
    { label: 'Đơn hàng', value: `${orders.length}` },
    {
      label: 'Nội dung cần kiểm duyệt',
      value: `${reportedContent.filter((r) => r.status === 'PENDING').length}`,
    },
  ];

  return (
    <Screen>
      <AppHeader
        title="Tổng quan nền tảng"
        subtitle="Marketplace StreetBiz"
        right={
          <IconButton
            icon="account-circle-outline"
            accessibilityLabel="Tài khoản"
            onPress={() => router.push('/account')}
          />
        }
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ flexGrow: 1, minWidth: 150 }}>
            <Text style={[typography.bodySm, { color: colors.muted }]}>{s.label}</Text>
            <Text style={[typography.headlineLg, { color: colors.text, marginTop: 2 }]}>
              {s.value}
            </Text>
          </Card>
        ))}
      </View>
      <Button
        label="Xuất báo cáo vận hành"
        variant="outline"
        onPress={() => showToast('Đã xuất báo cáo (demo)')}
      />
    </Screen>
  );
}
