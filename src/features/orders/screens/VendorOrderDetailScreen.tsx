import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { orderApi } from '../api/orderApi';
import {
  OrderActionPanel,
  OrderItemsList,
  OrderStatusBadge,
  OrderSummary,
  OrderTimeline,
  RejectOrderDialog,
  formatOrderDate,
  vendorActionsFor,
  type VendorOrderAction,
} from '../components';
import { useRefreshAfterOrderMutation, useVendorOrder } from '../hooks/useOrders';

export function VendorOrderDetailScreen() {
  const { orderId } = useParams();
  const order = useVendorOrder(orderId);
  const refresh = useRefreshAfterOrderMutation('vendor', Number(orderId));
  const [rejectOpen, setRejectOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [reason, setReason] = useState('');

  const transition = useMutation({
    mutationFn: ({ action, reason: rejectReason }: { action: VendorOrderAction; reason?: string }) => {
      const id = order.data!.orderId;
      if (action === 'accept') return orderApi.accept(id);
      if (action === 'reject') return orderApi.reject(id, rejectReason!.trim());
      if (action === 'preparing') return orderApi.preparing(id);
      if (action === 'ready') return orderApi.readyForPickup(id);
      return orderApi.confirmHandover(id);
    },
    onSuccess: async (updated, variables) => {
      setRejectOpen(false);
      setHandoverOpen(false);
      setReason('');
      await refresh.update(updated);
      showToast(
        variables.action === 'reject'
          ? 'Đã từ chối đơn và tạo yêu cầu hoàn tiền'
          : 'Đã cập nhật trạng thái đơn hàng',
      );
    },
    onError: refresh.handleError,
  });

  if (order.isPending) return <LoadingState />;
  if (order.isError || !order.data) {
    return <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />;
  }

  const data = order.data;
  const actions = vendorActionsFor(data.orderStatus);
  return (
    <Screen
      footer={
        actions.length ? (
          <StickyActions>
            <OrderActionPanel>
              {actions.includes('accept') ? (
                <Button
                  label="Nhận đơn"
                  variant="approve"
                  loading={transition.isPending}
                  onPress={() => transition.mutate({ action: 'accept' })}
                />
              ) : null}
              {actions.includes('reject') ? (
                <Button
                  label="Từ chối"
                  variant="danger"
                  disabled={transition.isPending}
                  onPress={() => setRejectOpen(true)}
                />
              ) : null}
              {actions.includes('preparing') ? (
                <Button
                  label="Bắt đầu chuẩn bị"
                  loading={transition.isPending}
                  onPress={() => transition.mutate({ action: 'preparing' })}
                />
              ) : null}
              {actions.includes('ready') ? (
                <Button
                  label="Sẵn sàng lấy món"
                  loading={transition.isPending}
                  onPress={() => transition.mutate({ action: 'ready' })}
                />
              ) : null}
              {actions.includes('handover') ? (
                <Button
                  label="Xác nhận đã giao khách"
                  disabled={transition.isPending}
                  onPress={() => setHandoverOpen(true)}
                />
              ) : null}
            </OrderActionPanel>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={`#${data.orderCode}`} back subtitle={data.customerName} />
      <div className="flex items-center justify-between gap-sm">
        <OrderStatusBadge status={data.orderStatus} />
        <span className="text-body-sm text-muted">
          {formatOrderDate(data.placedAt ?? data.createdAt)}
        </span>
      </div>
      <Card>
        <p className="text-label text-text">Khách hàng</p>
        <p className="text-body-md text-muted">{data.customerName ?? 'Khách hàng'}</p>
      </Card>
      {data.storefront.address ? (
        <Card>
          <p className="text-label text-text">Điểm nhận món</p>
          <p className="text-body-md text-muted">{data.storefront.address}</p>
        </Card>
      ) : null}
      <Card padded={false}>
        <OrderItemsList items={data.items} />
      </Card>
      <Card>
        <OrderSummary subtotal={data.subtotalAmount} total={data.totalAmount} />
      </Card>
      {data.rejectionReason ? (
        <Card>
          <p className="text-label text-error">Lý do từ chối</p>
          <p className="mt-2xs text-body-md text-muted">{data.rejectionReason}</p>
        </Card>
      ) : null}
      {data.statusHistory.length ? (
        <Card>
          <p className="mb-xs text-label text-text">Tiến trình</p>
          <OrderTimeline history={data.statusHistory} />
        </Card>
      ) : null}
      {transition.isError ? (
        <p role="alert" className="text-body-md text-error">{errorMessage(transition.error)}</p>
      ) : null}
      <RejectOrderDialog
        visible={rejectOpen}
        reason={reason}
        pending={transition.isPending}
        onReasonChange={setReason}
        onClose={() => {
          setRejectOpen(false);
          setReason('');
        }}
        onConfirm={() => {
          if (reason.trim()) transition.mutate({ action: 'reject', reason });
        }}
      />
      <ConfirmDialog
        visible={handoverOpen}
        title="Xác nhận đã bàn giao?"
        description="Đơn sẽ chuyển sang hoàn tất và được tính vào doanh thu."
        confirmLabel="Đã giao khách"
        onConfirm={() => transition.mutate({ action: 'handover' })}
        onCancel={() => setHandoverOpen(false)}
      />
    </Screen>
  );
}
