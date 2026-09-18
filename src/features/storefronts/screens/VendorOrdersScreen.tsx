import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Money } from '@/components/common';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  showToast,
} from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, BottomSheet, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage, type CommerceOrder } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
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

type SellerAction =
  | { kind: 'accept' | 'prepare' | 'ready' | 'handover'; order: CommerceOrder }
  | { kind: 'reject'; order: CommerceOrder; reason: string };

export function VendorOrdersScreen() {
  return isLiveApi ? <LiveVendorOrdersScreen /> : <MockVendorOrdersScreen />;
}

function LiveVendorOrdersScreen() {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<CommerceOrder | null>(null);
  const [confirmingHandover, setConfirmingHandover] = useState<CommerceOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const orders = useQuery({
    queryKey: ['commerce', 'seller-orders'],
    queryFn: () => commerceApi.sellerOrders(),
    refetchInterval: 5_000,
  });
  const transition = useMutation({
    mutationFn: (action: SellerAction) => {
      const { kind, order } = action;
      if (kind === 'accept') {
        return commerceApi.decideSellerOrder(order.orderId, 'ACCEPT', null, order.orderStatus);
      }
      if (kind === 'reject') {
        return commerceApi.decideSellerOrder(
          order.orderId,
          'REJECT',
          action.reason,
          order.orderStatus,
        );
      }
      if (kind === 'prepare') {
        return commerceApi.updateSellerOrderStatus(order.orderId, 'PREPARING', order.orderStatus);
      }
      if (kind === 'ready') {
        return commerceApi.updateSellerOrderStatus(
          order.orderId,
          'READY_FOR_PICKUP',
          order.orderStatus,
        );
      }
      return commerceApi.confirmHandover(order.orderId, order.orderStatus);
    },
    onSuccess: async (updated, action) => {
      queryClient.setQueryData<CommerceOrder[]>(['commerce', 'seller-orders'], (current) =>
        current?.map((order) => (order.orderId === updated.orderId ? updated : order)),
      );
      await queryClient.invalidateQueries({ queryKey: ['commerce', 'sales-summary'] });
      setRejecting(null);
      setConfirmingHandover(null);
      setRejectionReason('');
      showToast(
        action.kind === 'reject'
          ? 'Đã từ chối đơn; yêu cầu hoàn tiền đang được xử lý'
          : 'Đã cập nhật trạng thái đơn hàng',
      );
    },
  });

  if (orders.isPending) return <LoadingState />;
  if (orders.isError) {
    return <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />;
  }

  return (
    <Screen>
      <AppHeader title="Đơn hàng" back subtitle="Đơn đã thanh toán và lịch sử xử lý" />
      {orders.data.length === 0 ? (
        <EmptyState icon="receipt-text-outline" title="Chưa có đơn hàng nào" />
      ) : (
        orders.data.map((order) => (
          <Card key={order.orderId}>
            <div className="flex items-center justify-between gap-sm">
              <div className="min-w-0 flex-1">
                <span className="block text-headline-sm text-text">#{order.orderCode}</span>
                <span className="block truncate text-body-sm text-muted">{order.customerName}</span>
              </div>
              <StatusChip code={order.orderStatus} />
            </div>
            {order.items.map((item) => (
              <p key={item.orderItemId} className="text-body-md text-muted">
                {item.quantity}× {item.itemName}
                {item.note ? ` · ${item.note}` : ''}
              </p>
            ))}
            {order.rejectionReason ? (
              <p className="mt-xs text-body-sm text-error">Lý do: {order.rejectionReason}</p>
            ) : null}
            {order.refundStatus ? (
              <p className="mt-xs text-body-sm text-muted">
                Hoàn tiền: {refundPresentation(order.refundStatus)}
              </p>
            ) : null}
            <div className="mt-xs">
              <Money amountVnd={order.totalAmount} />
            </div>
            <div className="mt-sm flex gap-sm">
              {order.orderStatus === 'PLACED' ? (
                <>
                  <div className="flex-1">
                    <Button
                      label="Nhận đơn"
                      variant="approve"
                      loading={transition.isPending}
                      onPress={() => transition.mutate({ kind: 'accept', order })}
                    />
                  </div>
                  <div className="flex-1">
                    <Button
                      label="Từ chối"
                      variant="outline"
                      disabled={transition.isPending}
                      onPress={() => {
                        setRejecting(order);
                        setRejectionReason('');
                      }}
                    />
                  </div>
                </>
              ) : order.orderStatus === 'ACCEPTED' ? (
                <Button
                  label="Bắt đầu chuẩn bị"
                  loading={transition.isPending}
                  onPress={() => transition.mutate({ kind: 'prepare', order })}
                />
              ) : order.orderStatus === 'PREPARING' ? (
                <Button
                  label="Sẵn sàng lấy món"
                  loading={transition.isPending}
                  onPress={() => transition.mutate({ kind: 'ready', order })}
                />
              ) : order.orderStatus === 'READY_FOR_PICKUP' ? (
                <Button
                  label="Xác nhận đã giao khách"
                  loading={transition.isPending}
                  onPress={() => setConfirmingHandover(order)}
                />
              ) : null}
            </div>
          </Card>
        ))
      )}
      {transition.isError ? (
        <p className="text-body-md text-error">{errorMessage(transition.error)}</p>
      ) : null}
      <BottomSheet
        visible={Boolean(rejecting)}
        onClose={() => {
          setRejecting(null);
          setRejectionReason('');
        }}
      >
        <h2 className="text-headline-md text-text">Từ chối đơn hàng</h2>
        <TextField
          label="Lý do từ chối"
          value={rejectionReason}
          onChangeText={setRejectionReason}
          placeholder="Ví dụ: Món đã hết"
          multiline
          maxLength={500}
          error={
            rejecting && rejectionReason.trim().length === 0
              ? 'Vui lòng nhập lý do để khách hàng biết.'
              : undefined
          }
        />
        <Button
          label="Xác nhận từ chối"
          variant="danger"
          loading={transition.isPending}
          disabled={!rejectionReason.trim()}
          onPress={() => {
            if (rejecting && rejectionReason.trim()) {
              transition.mutate({
                kind: 'reject',
                order: rejecting,
                reason: rejectionReason.trim(),
              });
            }
          }}
        />
      </BottomSheet>
      <ConfirmDialog
        visible={Boolean(confirmingHandover)}
        title="Xác nhận đã bàn giao?"
        description="Đơn sẽ được chuyển sang hoàn tất và được tính vào doanh thu. Thao tác này không thể hoàn tác."
        confirmLabel="Đã giao khách"
        onConfirm={() => {
          if (confirmingHandover) {
            transition.mutate({ kind: 'handover', order: confirmingHandover });
          }
        }}
        onCancel={() => setConfirmingHandover(null)}
      />
    </Screen>
  );
}

function MockVendorOrdersScreen() {
  const user = useAuthStore((state) => state.user);
  const storefront = useMockDb((state) =>
    state.storefronts.find((row) => row.vendorId === user?.vendorId),
  );
  const orders = useMockDb((state) => state.orders)
    .filter((order) => order.storefrontId === storefront?.id)
    .slice()
    .reverse();
  const updateOrderStatus = useMockDb((state) => state.updateOrderStatus);

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

function refundPresentation(status: string) {
  if (status === 'SUCCESS') return 'Đã hoàn tiền';
  if (status === 'FAILED') return 'Thất bại';
  return 'Đang xử lý';
}
