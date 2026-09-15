import { Text, View } from 'react-native';

import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function SalesSummaryScreen() {
  const user = useAuthStore((s) => s.user);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === user?.vendorId));
  const orders = useMockDb((s) => s.orders).filter(
    (o) => o.storefrontId === storefront?.id && o.order_status === 'PICKED_UP',
  );

  const total = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <Screen>
      <AppHeader title="Doanh thu" back />
      <Card style={{ backgroundColor: colors.indigo }}>
        <Text style={[typography.bodyMd, { color: '#C7CCDB' }]}>Doanh thu đã hoàn tất</Text>
        <Money amountVnd={total} size="lg" color={colors.white} />
        <Text style={[typography.bodySm, { color: '#C7CCDB', marginTop: 4 }]}>
          {orders.length} đơn hàng
        </Text>
      </Card>
      {orders.length === 0 ? (
        <EmptyState icon="chart-line" title="Chưa có đơn hoàn tất" />
      ) : (
        orders.map((o) => (
          <Card key={o.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.bodyMd, { color: colors.text }]}>#{o.order_code}</Text>
              <Money amountVnd={o.total} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
