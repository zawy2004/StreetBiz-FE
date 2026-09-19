import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { colors } from '@/theme';

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
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const paymentOptions = useQuery({
    queryKey: ['commerce', 'payment-options'],
    queryFn: commerceApi.paymentOptions,
  });
  const sandboxRefund = useMutation({
    mutationFn: () => commerceApi.confirmSandboxRefund(order.data!.orderId),
    onSuccess: async (next) => {
      queryClient.setQueryData(['commerce', 'customer-order', orderId], next);
      await queryClient.invalidateQueries({ queryKey: ['commerce', 'customer-orders'] });
      showToast('Đã mô phỏng hoàn tiền thành công');
    },
  });
  const order = useQuery({
    queryKey: ['commerce', 'customer-order', orderId],
    queryFn: () => commerceApi.customerOrder(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: 5_000,
  });
  const transition = useMutation({
    mutationFn: (action: 'cancel' | 'pickup') =>
      action === 'cancel'
        ? commerceApi.cancelOrder(order.data!.orderId, order.data!.orderStatus)
        : commerceApi.confirmPickup(order.data!.orderId, order.data!.orderStatus),
    onSuccess: async (next, action) => {
      setConfirmCancel(false);
      queryClient.setQueryData(['commerce', 'customer-order', orderId], next);
      await queryClient.invalidateQueries({ queryKey: ['commerce', 'customer-orders'] });
      showToast(
        action === 'cancel'
          ? 'Đã huỷ đơn; yêu cầu hoàn tiền đang được xử lý nếu đã thanh toán'
          : 'Đã xác nhận nhận món',
      );
    },
  });
  if (order.isPending) return <LoadingState />;
  if (order.isError || !order.data) {
    return <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />;
  }

  const data = order.data;
  const canCancel = data.orderStatus === 'PENDING_PAYMENT' || data.orderStatus === 'PLACED';
  const canConfirmPickup = data.orderStatus === 'READY_FOR_PICKUP';
  const refund = data.refundStatus ? refundPresentation(data.refundStatus) : null;
  return (
    <Screen
      footer={
        canCancel || canConfirmPickup ? (
          <StickyActions>
            {data.orderStatus === 'PENDING_PAYMENT' ? (
              <Button
                label="Tiếp tục thanh toán"
                disabled={transition.isPending}
                onPress={() => navigate(`/customer/orders/${data.orderId}/payment`)}
              />
            ) : null}
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
                onPress={() => transition.mutate('pickup')}
              />
            ) : null}
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={`#${data.orderCode}`} back subtitle={data.storefrontName} />
      <div className="flex items-center gap-sm">
        <StatusChip code={data.orderStatus} />
        {data.paymentStatus ? <StatusChip code={data.paymentStatus} /> : null}
      </div>
      <Card padded={false}>
        <div className="px-md">
          {data.items.map((item, index) => (
            <div key={item.orderItemId}>
              {index ? <Divider /> : null}
              <ListRow
                title={`${item.quantity}× ${item.itemName}`}
                subtitle={item.note ?? undefined}
                trailing={<Money amountVnd={item.unitPrice * item.quantity} />}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-headline-sm text-text">Tổng thanh toán</span>
          <Money amountVnd={data.totalAmount} size="lg" />
        </div>
        <p className="mt-1 text-body-sm text-muted">
          {data.paymentProvider ?? 'Chưa chọn cổng'} ·{' '}
          {new Date(data.createdAt).toLocaleString('vi-VN')}
        </p>
      </Card>
      {data.history.length ? (
        <Card>
          <p className="mb-xs text-label text-text">Tiến trình đơn hàng</p>
          {data.history.map((history) => (
            <div key={history.historyId} className="mb-xs flex items-center justify-between gap-sm">
              <StatusChip code={history.toStatus} />
              <span className="text-body-sm text-muted">
                {new Date(history.changedAt).toLocaleString('vi-VN')}
              </span>
            </div>
          ))}
        </Card>
      ) : null}
      {data.rejectionReason ? (
        <Card>
          <p className="text-label text-text">Lý do từ chối</p>
          <p className="text-body-md text-muted">{data.rejectionReason}</p>
        </Card>
      ) : null}
      {refund ? (
        <Card style={{ backgroundColor: '#E09F3E14', borderColor: '#E09F3E33' }}>
          <div className="mb-xs flex items-center justify-between gap-sm">
            <p className="text-label text-text">Hoàn tiền</p>
            <StatusChip label={refund.label} tone={refund.tone} />
          </div>
          {data.refundAmount !== null ? <Money amountVnd={data.refundAmount} /> : null}
          <p className="mt-xs text-body-md text-muted">{refund.message}</p>
          {data.refundStatus === 'PENDING' && paymentOptions.data?.mode === 'SANDBOX' ? (
            <Button
              label="Mô phỏng hoàn tiền sandbox"
              variant="outline"
              loading={sandboxRefund.isPending}
              onPress={() => sandboxRefund.mutate()}
            />
          ) : null}
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
      {sandboxRefund.isError ? (
        <p role="alert" className="text-error">
          {errorMessage(sandboxRefund.error)}
        </p>
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
        <Card style={{ backgroundColor: '#2D7D4614', borderColor: '#2D7D4633' }}>
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
