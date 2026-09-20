import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { ApiError } from '@/core/api/problem';
import { orderApi } from '@/features/orders/api/orderApi';
import {
  OrderActionPanel,
  OrderCard,
  OrderEmptyState,
  OrderListSkeleton,
  RejectOrderDialog,
  vendorActionsFor,
  type VendorOrderAction,
} from '@/features/orders/components';
import { orderKeys, useVendorOrders } from '@/features/orders/hooks/useOrders';
import type { Order, OrderStatus } from '@/features/orders/types/order.types';

type VendorTab =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CLOSED';

const TABS: { value: VendorTab; label: string }[] = [
  { value: 'PLACED', label: 'Đơn mới' },
  { value: 'ACCEPTED', label: 'Đã nhận' },
  { value: 'PREPARING', label: 'Đang chuẩn bị' },
  { value: 'READY_FOR_PICKUP', label: 'Sẵn sàng giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CLOSED', label: 'Từ chối / hủy' },
];

type Action = { kind: VendorOrderAction; order: Order; reason?: string };

export function VendorOrdersScreen() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [tab, setTab] = useState<VendorTab>('PLACED');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [handover, setHandover] = useState<Order | null>(null);
  const [reason, setReason] = useState('');
  const status = tab === 'CLOSED' ? undefined : (tab as OrderStatus);
  const orders = useVendorOrders({ status, page, pageSize: 10 });

  const transition = useMutation({
    mutationFn: ({ kind, order, reason: rejectionReason }: Action) => {
      if (kind === 'accept') return orderApi.accept(order.orderId);
      if (kind === 'reject') return orderApi.reject(order.orderId, rejectionReason!.trim());
      if (kind === 'preparing') return orderApi.preparing(order.orderId);
      if (kind === 'ready') return orderApi.readyForPickup(order.orderId);
      return orderApi.confirmHandover(order.orderId);
    },
    onSuccess: async (updated, action) => {
      cache.setQueryData(orderKeys.vendorDetail(updated.orderId), updated);
      await Promise.all([
        cache.invalidateQueries({ queryKey: orderKeys.vendorLists }),
        cache.invalidateQueries({ queryKey: ['orders', 'vendor', 'sales'] }),
      ]);
      setRejecting(null);
      setHandover(null);
      setReason('');
      showToast(
        action.kind === 'reject'
          ? 'Đã từ chối đơn; yêu cầu hoàn tiền đang được xử lý'
          : 'Đã cập nhật trạng thái đơn hàng',
      );
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await cache.invalidateQueries({ queryKey: orderKeys.vendorLists });
        showToast('Trạng thái đơn đã thay đổi. Danh sách vừa được tải lại.');
      }
    },
  });

  const visible = (orders.data?.items ?? []).filter((order) =>
    tab === 'CLOSED' ? ['REJECTED', 'CANCELLED'].includes(order.orderStatus) : true,
  );

  const actions = (order: Order) => (
    <OrderActionPanel>
      <Button
        label="Chi tiết"
        variant="outline"
        fullWidth={false}
        onPress={() => navigate(`/vendor/orders/${order.orderId}`)}
      />
      {vendorActionsFor(order.orderStatus).includes('accept') ? (
        <Button
          label="Nhận đơn"
          variant="approve"
          fullWidth={false}
          loading={transition.isPending}
          onPress={() => transition.mutate({ kind: 'accept', order })}
        />
      ) : null}
      {vendorActionsFor(order.orderStatus).includes('reject') ? (
        <Button
          label="Từ chối"
          variant="danger"
          fullWidth={false}
          disabled={transition.isPending}
          onPress={() => {
            setRejecting(order);
            setReason('');
          }}
        />
      ) : null}
      {vendorActionsFor(order.orderStatus).includes('preparing') ? (
        <Button
          label="Bắt đầu chuẩn bị"
          fullWidth={false}
          loading={transition.isPending}
          onPress={() => transition.mutate({ kind: 'preparing', order })}
        />
      ) : null}
      {vendorActionsFor(order.orderStatus).includes('ready') ? (
        <Button
          label="Sẵn sàng lấy món"
          fullWidth={false}
          loading={transition.isPending}
          onPress={() => transition.mutate({ kind: 'ready', order })}
        />
      ) : null}
      {vendorActionsFor(order.orderStatus).includes('handover') ? (
        <Button
          label="Xác nhận đã giao khách"
          fullWidth={false}
          disabled={transition.isPending}
          onPress={() => setHandover(order)}
        />
      ) : null}
    </OrderActionPanel>
  );

  return (
    <Screen>
      <AppHeader
        title="Đơn hàng"
        back
        subtitle="Chỉ hiển thị đơn đã được backend xác nhận thanh toán"
        right={
          <Button
            label="Làm mới"
            variant="ghost"
            fullWidth={false}
            onPress={() => void orders.refetch()}
          />
        }
      />
      <div className="overflow-x-auto pb-2xs">
        <div className="min-w-[720px]">
          <SegmentedControl
            value={tab}
            onChange={(next) => {
              setTab(next);
              setPage(1);
            }}
            options={TABS}
          />
        </div>
      </div>

      {orders.isPending ? (
        <OrderListSkeleton />
      ) : orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : visible.length === 0 ? (
        <OrderEmptyState vendor />
      ) : (
        visible.map((order) => (
          <OrderCard key={order.orderId} order={order} actions={actions(order)} />
        ))
      )}

      {orders.data && orders.data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-sm">
          <Button
            label="Trang trước"
            variant="outline"
            disabled={page <= 1}
            onPress={() => setPage((current) => current - 1)}
          />
          <span className="whitespace-nowrap text-body-sm text-muted">
            {page}/{orders.data.totalPages}
          </span>
          <Button
            label="Trang sau"
            variant="outline"
            disabled={page >= orders.data.totalPages}
            onPress={() => setPage((current) => current + 1)}
          />
        </div>
      ) : null}

      {transition.isError ? (
        <p role="alert" className="text-body-md text-error">
          {errorMessage(transition.error)}
        </p>
      ) : null}
      <RejectOrderDialog
        visible={Boolean(rejecting)}
        reason={reason}
        pending={transition.isPending}
        onReasonChange={setReason}
        onClose={() => {
          setRejecting(null);
          setReason('');
        }}
        onConfirm={() => {
          if (rejecting && reason.trim()) {
            transition.mutate({ kind: 'reject', order: rejecting, reason });
          }
        }}
      />
      <ConfirmDialog
        visible={Boolean(handover)}
        title="Xác nhận đã bàn giao?"
        description="Đơn sẽ hoàn tất và được tính vào doanh thu. Thao tác này không thể hoàn tác."
        confirmLabel="Đã giao khách"
        onConfirm={() => {
          if (handover) transition.mutate({ kind: 'handover', order: handover });
        }}
        onCancel={() => setHandover(null)}
      />
    </Screen>
  );
}
