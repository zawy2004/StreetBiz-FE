import { Text, View } from 'react-native';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, showToast } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

const NEXT_STATUS: Record<string, string> = {
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY_FOR_PICKUP',
  READY_FOR_PICKUP: 'PICKED_UP',
};

const NEXT_LABEL: Record<string, string> = {
  ACCEPTED: 'Bắt đầu chuẩn bị',
  PREPARING: 'Sẵn sàng lấy món',
  READY_FOR_PICKUP: 'Xác nhận đã giao khách',
};

export function VendorOrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === user?.vendorId));
  const orders = useMockDb((s) => s.orders)
    .filter((o) => o.storefrontId === storefront?.id)
    .slice()
    .reverse();
  const updateOrderStatus = useMockDb((s) => s.updateOrderStatus);

  return (
    <Screen>
      <AppHeader title="Đơn hàng" back />
      {orders.length === 0 ? (
        <EmptyState icon="receipt-text-outline" title="Chưa có đơn hàng nào" />
      ) : (
        orders.map((order) => (
          <Card key={order.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>
                #{order.order_code}
              </Text>
              <StatusChip code={order.order_status} />
            </View>
            {order.items.map((item) => (
              <Text key={item.menuItemId} style={[typography.bodyMd, { color: colors.muted }]}>
                {item.quantity}× {item.name}
              </Text>
            ))}
            <View style={{ marginTop: spacing.xs }}>
              <Money amountVnd={order.total} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              {order.order_status === 'PENDING' ? (
                <>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Nhận đơn"
                      variant="approve"
                      onPress={() => updateOrderStatus(order.id, 'ACCEPTED')}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Từ chối"
                      variant="outline"
                      onPress={() => {
                        updateOrderStatus(order.id, 'REJECTED');
                        showToast('Đã từ chối, hoàn tiền cho khách');
                      }}
                    />
                  </View>
                </>
              ) : NEXT_STATUS[order.order_status] ? (
                <Button
                  label={NEXT_LABEL[order.order_status] ?? 'Cập nhật'}
                  onPress={() => updateOrderStatus(order.id, NEXT_STATUS[order.order_status]!)}
                />
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
