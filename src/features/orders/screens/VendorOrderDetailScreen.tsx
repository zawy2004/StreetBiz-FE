import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Icon } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { orderApi } from '../api/orderApi';
import {
  HandoverWithoutCodeDialog,
  OrderActionPanel,
  OrderItemsList,
  OrderStatusBadge,
  OrderSummary,
  OrderTimeline,
  RejectOrderDialog,
  formatOrderDate,
  formatOrderTime,
  vendorActionsFor,
  type VendorOrderAction,
} from '../components';
import { useRefreshAfterOrderMutation, useVendorOrder } from '../hooks/useOrders';
import { useVendorArrivals } from '../hooks/useOrderTracking';

export function VendorOrderDetailScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useVendorOrder(orderId);
  // ORD-02 "Tôi đang đến": shown while the customer is on the way.
  const arrival = useVendorArrivals().get(Number(orderId));
  const refresh = useRefreshAfterOrderMutation('vendor', Number(orderId));
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverReason, setHandoverReason] = useState('');

  const transition = useMutation({
    mutationFn: ({
      action,
      reason: rejectReason,
    }: {
      // Handover is not a status change the seller can press: it goes through
      // the scanner or the no-code dialog, never this mutation.
      action: Exclude<VendorOrderAction, 'handover'>;
      reason?: string;
    }) => {
      const id = order.data!.orderId;
      if (action === 'accept') return orderApi.accept(id);
      if (action === 'reject') return orderApi.reject(id, rejectReason!.trim());
      if (action === 'preparing') return orderApi.preparing(id);
      return orderApi.readyForPickup(id);
    },
    onSuccess: async (updated, variables) => {
      setRejectOpen(false);
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

  // ORD-06: kept apart from the status transitions above because it is not one.
  // This is the exception route - no code was read - and it only goes through
  // because the seller writes down why, which the buyer then sees.
  const manualHandover = useMutation({
    mutationFn: (written: string) =>
      orderApi.handoverWithoutCode(order.data!.orderId, written.trim()),
    onSuccess: async (updated) => {
      setHandoverOpen(false);
      setHandoverReason('');
      await refresh.update(updated);
      showToast('Đã giao đơn; lý do không có mã được lưu vào lịch sử đơn');
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
                // ORD-06: an order is handed over by reading the buyer's code,
                // never by the seller asserting it, so this leads to the scanner
                // rather than completing the order on the spot.
                <Button
                  label="Quét mã nhận hàng của khách"
                  onPress={() => navigate('/vendor/orders/scan')}
                />
              ) : null}
              {actions.includes('handover') ? (
                // Deliberately the plainer button: the stall needs a way out
                // when the buyer has no code at all, not a second normal route.
                <Button
                  label="Khách không có mã"
                  variant="outline"
                  disabled={manualHandover.isPending}
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
      {arrival ? (
        <p className="flex items-start gap-xs rounded-sm bg-tint-tertiary px-sm py-xs text-body-sm text-text">
          <Icon name="walk" size={16} className="mt-px shrink-0" />
          <span>
            <strong className="font-semibold">Khách đang đến</strong> · báo lúc{' '}
            {formatOrderTime(arrival.notifiedAt)}. {arrival.message}
          </span>
        </p>
      ) : null}
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
      {transition.isError || manualHandover.isError ? (
        <p role="alert" className="text-body-md text-error">
          {errorMessage(transition.isError ? transition.error : manualHandover.error)}
        </p>
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
      <HandoverWithoutCodeDialog
        visible={handoverOpen}
        reason={handoverReason}
        pending={manualHandover.isPending}
        onReasonChange={setHandoverReason}
        onClose={() => {
          setHandoverOpen(false);
          setHandoverReason('');
        }}
        onConfirm={() => manualHandover.mutate(handoverReason)}
      />
    </Screen>
  );
}
