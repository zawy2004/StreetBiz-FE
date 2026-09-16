import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';

const CANCELLABLE = ['PENDING', 'ACCEPTED'];

export function OrderDetailScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const order = useMockDb((s) => s.orders.find((o) => o.id === orderId));
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.id === order?.storefrontId));
  const cancelOrder = useMockDb((s) => s.cancelOrder);
  const updateOrderStatus = useMockDb((s) => s.updateOrderStatus);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!order) return <ErrorState message="Không tìm thấy đơn hàng." />;

  const canCancel = CANCELLABLE.includes(order.order_status);
  const canConfirmPickup = order.order_status === 'READY_FOR_PICKUP';
  const isDone = order.order_status === 'PICKED_UP';

  return (
    <Screen
      footer={
        canCancel || canConfirmPickup || isDone ? (
          <StickyActions>
            {canCancel ? (
              <Button label="Huỷ đơn" variant="outline" onPress={() => setConfirmCancel(true)} />
            ) : null}
            {canConfirmPickup ? (
              <Button
                label="Đã nhận món"
                onPress={() => {
                  updateOrderStatus(order.id, 'PICKED_UP');
                  showToast('Cảm ơn bạn đã ủng hộ!');
                }}
              />
            ) : null}
            {isDone ? (
              <Button
                label="Đánh giá đơn hàng"
                onPress={() => navigate(`/customer/orders/${order.id}/review`)}
              />
            ) : null}
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={`#${order.order_code}`} back subtitle={storefront?.name} />
      <div className="flex items-start">
        <StatusChip code={order.order_status} />
      </div>
      <Card padded={false}>
        <div className="px-md">
          {order.items.map((item, i) => (
            <div key={item.menuItemId}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={`${item.quantity}× ${item.name}`}
                trailing={<Money amountVnd={item.price * item.quantity} />}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-headline-sm text-text">Tổng đã thanh toán</span>
          <Money amountVnd={order.total} size="lg" />
        </div>
        <p className="mt-1 text-body-sm text-muted">
          {new Date(order.created_at).toLocaleString('vi-VN')}
        </p>
      </Card>

      {order.order_status === 'REJECTED' || order.order_status === 'CANCELLED' ? (
        <Card style={{ backgroundColor: '#2D7D4614', borderColor: '#2D7D4633' }}>
          <p className="text-body-md" style={{ color: colors.tertiary }}>
            Đã hoàn tiền vào ví thanh toán.
          </p>
        </Card>
      ) : null}

      {isDone ? (
        <Button
          label="Khiếu nại / yêu cầu hoàn tiền"
          variant="ghost"
          onPress={() => navigate(`/customer/orders/${order.id}/complaint`)}
        />
      ) : null}

      <ConfirmDialog
        visible={confirmCancel}
        title="Huỷ đơn hàng?"
        description="Số tiền đã thanh toán sẽ được hoàn lại."
        confirmLabel="Huỷ đơn"
        confirmVariant="danger"
        onConfirm={() => {
          cancelOrder(order.id);
          setConfirmCancel(false);
          showToast('Đã huỷ đơn, tiền sẽ được hoàn lại');
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </Screen>
  );
}
