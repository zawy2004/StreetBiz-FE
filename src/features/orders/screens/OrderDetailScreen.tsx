import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { colors } from '@/theme';
import { orderApi } from '../api/orderApi';
import {
  OrderItemsList,
  OrderStatusBadge,
  OrderSummary,
  OrderTimeline,
  formatOrderDate,
} from '../components';
import { useCustomerOrder, useRefreshAfterOrderMutation } from '../hooks/useOrders';

function refundPresentation(status: string) {
  if (status === 'SUCCESS') {
    return {
      label: 'Đã hoàn tiền',
      tone: 'ok' as const,
      message: 'Hệ thống đã ghi nhận hoàn tiền thành công.',
    };
  }
  if (status === 'FAILED') {
    return {
      label: 'Hoàn tiền thất bại',
      tone: 'danger' as const,
      message: 'Hoàn tiền chưa thành công. Vui lòng liên hệ hỗ trợ.',
    };
  }
  return {
    label: 'Đang hoàn tiền',
    tone: 'pending' as const,
    message: 'Yêu cầu hoàn tiền đang chờ cổng thanh toán xử lý.',
  };
}

export function OrderDetailScreen() {
  return isLiveApi ? <LiveOrderDetailScreen /> : <MockOrderDetailScreen />;
}

function LiveOrderDetailScreen() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmPickup, setConfirmPickup] = useState(false);
  const order = useCustomerOrder(orderId);
  const refresh = useRefreshAfterOrderMutation('customer', Number(orderId));
  const transition = useMutation({
    mutationFn: (action: 'cancel' | 'pickup') =>
      action === 'cancel'
        ? orderApi.cancel(order.data!.orderId)
        : orderApi.confirmPickup(order.data!.orderId),
    onSuccess: async (next, action) => {
      setConfirmCancel(false);
      setConfirmPickup(false);
      await refresh.update(next);
      showToast(
        action === 'cancel'
          ? 'Đã huỷ đơn; yêu cầu hoàn tiền đang được xử lý nếu đã thanh toán'
          : 'Đã xác nhận nhận món',
      );
    },
    onError: refresh.handleError,
  });
  if (order.isPending) return <LoadingState />;
  if (order.isError || !order.data) {
    return <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />;
  }

  const data = order.data;
  const canCancel = data.orderStatus === 'PLACED';
  const canConfirmPickup = data.orderStatus === 'READY_FOR_PICKUP';
  const refund = data.refundStatus ? refundPresentation(data.refundStatus) : null;
  return (
    <Screen
      footer={
        canCancel || canConfirmPickup ? (
          <StickyActions>
            {canCancel ? (
              <Button
                label="Huỷ đơn"
                variant="outline"
                disabled={transition.isPending}
                onPress={() => setConfirmCancel(true)}
              />
            ) : null}
            {canConfirmPickup ? (
              <Button
                label="Đã nhận món"
                loading={transition.isPending}
                onPress={() => setConfirmPickup(true)}
              />
            ) : null}
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={`#${data.orderCode}`} back subtitle={data.storefront.storefrontName} />
      <div className="flex items-center gap-sm">
        <OrderStatusBadge status={data.orderStatus} />
        {data.paymentStatus ? <StatusChip code={data.paymentStatus} /> : null}
      </div>
      {data.orderStatus === 'PENDING_PAYMENT' ? (
        <Card style={{ backgroundColor: 'rgb(var(--c-secondary) / 0.1)', borderColor: 'rgb(var(--c-secondary) / 0.35)' }}>
          <p className="text-headline-sm text-text">Đang chờ xác nhận thanh toán</p>
          <p className="mt-2xs text-body-md text-muted">
            Trạng thái chỉ thay đổi sau khi backend nhận callback hợp lệ từ cổng thanh toán.
          </p>
        </Card>
      ) : null}
      {data.orderStatus === 'READY_FOR_PICKUP' ? (
        <Card style={{ borderColor: colors.tertiary }}>
          <p className="text-center text-body-sm text-muted">Mã nhận món</p>
          <p className="mt-xs break-all text-center text-display-sm text-text">{data.orderCode}</p>
          <p className="mt-xs text-center text-body-sm text-muted">
            Đưa mã này cho người bán tại điểm bán.
          </p>
        </Card>
      ) : null}
      <Card>
        <div className="flex items-center gap-sm">
          {data.storefront.imageUrl ? (
            <img
              src={data.storefront.imageUrl}
              alt=""
              className="h-16 w-16 rounded-sm object-cover"
            />
          ) : null}
          <div>
            <p className="text-headline-sm text-text">{data.storefront.storefrontName}</p>
            {data.storefront.address ? (
              <p className="text-body-sm text-muted">{data.storefront.address}</p>
            ) : null}
            <p className="text-body-sm text-muted">Nhận trực tiếp tại điểm bán</p>
          </div>
        </div>
      </Card>
      <Card padded={false}>
        <OrderItemsList items={data.items} />
      </Card>
      <Card>
        <OrderSummary subtotal={data.subtotalAmount} total={data.totalAmount} />
        <p className="mt-xs text-body-sm text-muted">
          {data.paymentProvider ?? 'Chưa chọn cổng'} · Tạo lúc {formatOrderDate(data.createdAt)}
        </p>
        {data.placedAt ? (
          <p className="text-body-sm text-muted">Đặt lúc {formatOrderDate(data.placedAt)}</p>
        ) : null}
        {data.completedAt ? (
          <p className="text-body-sm text-muted">Hoàn tất lúc {formatOrderDate(data.completedAt)}</p>
        ) : null}
      </Card>
      {data.statusHistory.length ? (
        <Card>
          <p className="mb-xs text-label text-text">Tiến trình đơn hàng</p>
          <OrderTimeline history={data.statusHistory} />
        </Card>
      ) : null}
      {data.rejectionReason ? (
        <Card>
          <p className="text-label text-text">Lý do từ chối</p>
          <p className="text-body-md text-muted">{data.rejectionReason}</p>
        </Card>
      ) : null}
      {refund ? (
        <Card style={{ backgroundColor: 'rgb(var(--c-secondary) / 0.1)', borderColor: 'rgb(var(--c-secondary) / 0.35)' }}>
          <div className="mb-xs flex items-center justify-between gap-sm">
            <p className="text-label text-text">Hoàn tiền</p>
            <StatusChip label={refund.label} tone={refund.tone} />
          </div>
          {data.refundAmount != null ? <Money amountVnd={data.refundAmount} /> : null}
          <p className="mt-xs text-body-md text-muted">{refund.message}</p>
          {data.refundRequestedAt ? (
            <p className="mt-2xs text-body-sm text-muted">
              Yêu cầu lúc {new Date(data.refundRequestedAt).toLocaleString('vi-VN')}
            </p>
          ) : null}
        </Card>
      ) : null}
      {data.paymentStatus === 'SUCCESS' &&
      !['PENDING_PAYMENT', 'PLACED'].includes(data.orderStatus) ? (
        <Button
          label="Khiếu nại / Yêu cầu hoàn tiền"
          variant="outline"
          onPress={() => navigate(`/customer/orders/${data.orderId}/complaint`)}
        />
      ) : null}
      {data.orderStatus === 'COMPLETED' ? (
        <Button
          label="Đánh giá đơn hàng"
          variant="outline"
          onPress={() => navigate(`/customer/orders/${data.orderId}/review`)}
        />
      ) : null}
      {transition.isError ? (
        <p className="text-body-md text-error">{errorMessage(transition.error)}</p>
      ) : null}
      <ConfirmDialog
        visible={confirmCancel}
        title="Huỷ đơn hàng?"
        description="Chỉ đơn chưa được người bán nhận mới có thể huỷ. Nếu đã thanh toán, Backend sẽ tạo yêu cầu hoàn tiền."
        confirmLabel="Huỷ đơn"
        confirmVariant="danger"
        onConfirm={() => transition.mutate('cancel')}
        onCancel={() => setConfirmCancel(false)}
      />
      <ConfirmDialog
        visible={confirmPickup}
        title="Xác nhận đã nhận món?"
        description="Bạn xác nhận đã nhận đủ món tại điểm bán?"
        confirmLabel="Đã nhận đủ món"
        onConfirm={() => transition.mutate('pickup')}
        onCancel={() => setConfirmPickup(false)}
      />
    </Screen>
  );
}

function MockOrderDetailScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const order = useMockDb((state) => state.orders.find((row) => row.id === orderId));
  const storefront = useMockDb((state) =>
    state.storefronts.find((row) => row.id === order?.storefrontId),
  );
  const cancelOrder = useMockDb((state) => state.cancelOrder);
  const updateOrderStatus = useMockDb((state) => state.updateOrderStatus);
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!order) return <ErrorState message="Không tìm thấy đơn hàng." />;
  const canCancel = ['PENDING', 'ACCEPTED'].includes(order.order_status);
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
      <StatusChip code={order.order_status} />
      <Card padded={false}>
        <div className="px-md">
          {order.items.map((item, index) => (
            <div key={item.menuItemId}>
              {index ? <Divider /> : null}
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
      </Card>
      {order.order_status === 'REJECTED' || order.order_status === 'CANCELLED' ? (
        <Card style={{ backgroundColor: 'rgb(var(--c-tertiary) / 0.08)', borderColor: 'rgb(var(--c-tertiary) / 0.3)' }}>
          <p className="text-body-md" style={{ color: colors.tertiary }}>
            Đã tạo yêu cầu hoàn tiền.
          </p>
        </Card>
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
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </Screen>
  );
}
