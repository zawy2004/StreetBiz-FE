import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, showToast } from '@/components/feedback';
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
            <div className="flex items-center justify-between">
              <span className="text-headline-sm text-text">#{order.order_code}</span>
              <StatusChip code={order.order_status} />
            </div>
            {order.items.map((item) => (
              <p key={item.menuItemId} className="text-body-md text-muted">
                {item.quantity}× {item.name}
              </p>
            ))}
            <div className="mt-xs">
              <Money amountVnd={order.total} />
            </div>
            <div className="mt-sm flex gap-sm">
              {order.order_status === 'PENDING' ? (
                <>
                  <div className="flex-1">
                    <Button
                      label="Nhận đơn"
                      variant="approve"
                      onPress={() => updateOrderStatus(order.id, 'ACCEPTED')}
                    />
                  </div>
                  <div className="flex-1">
                    <Button
                      label="Từ chối"
                      variant="outline"
                      onPress={() => {
                        updateOrderStatus(order.id, 'REJECTED');
                        showToast('Đã từ chối, hoàn tiền cho khách');
                      }}
                    />
                  </div>
                </>
              ) : NEXT_STATUS[order.order_status] ? (
                <Button
                  label={NEXT_LABEL[order.order_status] ?? 'Cập nhật'}
                  onPress={() => updateOrderStatus(order.id, NEXT_STATUS[order.order_status]!)}
                />
              ) : null}
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
