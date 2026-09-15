import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function CustomerOrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const orders = useMockDb((s) => s.orders)
    .filter((o) => o.customerId === user?.id)
    .slice()
    .reverse();
  const storefronts = useMockDb((s) => s.storefronts);

  if (!user) {
    return (
      <Screen>
        <AppHeader title="Đơn hàng" />
        <EmptyState
          icon="login"
          title="Đăng nhập để xem đơn hàng"
          action={<Button label="Đăng nhập" onPress={() => router.push('/auth/sign-in')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Đơn hàng của tôi" />
      {orders.length === 0 ? (
        <EmptyState icon="receipt-text-outline" title="Chưa có đơn hàng nào" />
      ) : (
        orders.map((o) => {
          const storefront = storefronts.find((st) => st.id === o.storefrontId);
          return (
            <Card key={o.id} onPress={() => router.push(`/customer/orders/${o.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 4 }}>
                  <Text style={[typography.headlineSm, { color: colors.text }]}>
                    {storefront?.name}
                  </Text>
                  <Text style={[typography.bodySm, { color: colors.muted }]}>#{o.order_code}</Text>
                </View>
                <StatusChip code={o.order_status} />
              </View>
              <View style={{ marginTop: 8 }}>
                <Money amountVnd={o.total} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
