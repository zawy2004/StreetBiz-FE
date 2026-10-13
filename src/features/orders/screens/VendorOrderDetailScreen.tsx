import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { orderApi } from '../api/orderApi';
import {
  HandoverWithoutCodeDialog,
  OrderSummary,
  OrderTimeline,
  RejectOrderDialog,
  formatOrderDate,
  vendorActionsFor,
  type VendorOrderAction,
} from '../components';
import { OfflineNotice } from '../components/OrderShapes';
import { providerName } from '../components/order-display';
import {
  KitchenTicketLarge,
  NextStepLine,
  OrderFactsStrip,
  StagePlate,
  StageRail,
  VendorOrderSkeleton,
  WaitClock,
} from '../components/vendor/VendorOrderParts';
import { useRefreshAfterOrderMutation, useVendorOrder } from '../hooks/useOrders';
import { TERMINAL_ORDER_STATUSES } from '../types/order.types';
import { NewOrdersHint } from '../components/vendor/NewOrdersHint';

export function VendorOrderDetailScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useVendorOrder(orderId);
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

  if (order.isPending) {
    return (
      <Screen>
        <AppHeader title="Chi tiết đơn" back />
        <VendorOrderSkeleton />
      </Screen>
    );
  }
  if (order.isError || !order.data) {
    return (
      <Screen>
        <AppHeader title="Chi tiết đơn" back />
        <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />
      </Screen>
    );
  }

  const data = order.data;
  const actions = vendorActionsFor(data.orderStatus);
  const live = !TERMINAL_ORDER_STATUSES.has(data.orderStatus);
  const gateway = providerName(data.paymentProvider);
  const paid = data.paymentStatus === 'SUCCESS' && gateway ? `Đã trả qua ${gateway}` : null;
  // One alert on screen: inside the no-code sheet while it is open, else above the actions.
  const sheetFailure =
    handoverOpen && manualHandover.isError ? errorMessage(manualHandover.error) : undefined;
  const bodyFailure =
    !sheetFailure && (transition.isError || manualHandover.isError)
      ? errorMessage(transition.isError ? transition.error : manualHandover.error)
      : null;

  return (
    <Screen
      footer={
        actions.length ? (
          <StickyActions>
            <div className="flex w-full flex-col gap-sm lg:flex-row-reverse lg:items-center lg:gap-md lg:[&>*]:min-w-[220px]">
              {actions.includes('accept') ? (
                <div className="[&>button]:h-14 [&>button]:text-[17px]">
                  <Button
                    label="Nhận đơn"
                    variant="approve"
                    loading={transition.isPending}
                    onPress={() => transition.mutate({ action: 'accept' })}
                  />
                </div>
              ) : null}
              {actions.includes('reject') ? (
                <div className="[&>button]:text-[#B42318] [&>button]:ring-[#B42318]/60 dark:[&>button]:text-[#FF9A90]">
                  <Button
                    label="Từ chối"
                    variant="outline"
                    disabled={transition.isPending}
                    onPress={() => setRejectOpen(true)}
                  />
                </div>
              ) : null}
              {actions.includes('preparing') ? (
                <div className="[&>button]:h-14 [&>button]:text-[17px]">
                  <Button
                    label="Bắt đầu chuẩn bị"
                    loading={transition.isPending}
                    onPress={() => transition.mutate({ action: 'preparing' })}
                  />
                </div>
              ) : null}
              {actions.includes('ready') ? (
                <div className="[&>button]:h-14 [&>button]:text-[17px]">
                  <Button
                    label="Sẵn sàng lấy món"
                    loading={transition.isPending}
                    onPress={() => transition.mutate({ action: 'ready' })}
                  />
                </div>
              ) : null}
              {actions.includes('handover') ? (
                // ORD-06: an order is handed over by reading the buyer's code,
                // never by the seller asserting it, so this leads to the scanner
                // rather than completing the order on the spot.
                <div className="[&>button]:h-14 [&>button]:text-[17px]">
                  <Button
                    label="Quét mã nhận hàng của khách"
                    icon={<Icon name="qrcode-scan" size={20} color="currentColor" />}
                    onPress={() => navigate('/vendor/orders/scan')}
                  />
                </div>
              ) : null}
              {actions.includes('handover') ? (
                // Deliberately the plainer button: the stall needs a way out
                // when the buyer has no code at all, not a second normal route.
                <div>
                  <Button
                    label="Khách không có mã"
                    variant="outline"
                    disabled={manualHandover.isPending}
                    onPress={() => setHandoverOpen(true)}
                  />
                </div>
              ) : null}
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={`#${data.orderCode}`} back subtitle={data.customerName} />
      <OfflineNotice message="Mất kết nối. Không đổi được trạng thái đơn lúc này." />

      <section aria-live="polite" className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center gap-sm">
          <StagePlate status={data.orderStatus} />
          {live ? <WaitClock order={data} /> : null}
          <span className="text-body-md text-muted">
            Đặt lúc {formatOrderDate(data.placedAt ?? data.createdAt)}
          </span>
        </div>
        <div className="rounded-[18px] bg-card px-md py-sm shadow-card ring-1 ring-border/80">
          <StageRail order={data} />
        </div>
        <NextStepLine status={data.orderStatus} />
      </section>

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-lg">
          <KitchenTicketLarge
            order={data}
            paid={paid}
            totals={<OrderSummary subtotal={data.subtotalAmount} total={data.totalAmount} />}
          />
          {data.rejectionReason ? (
            <section
              aria-label="Lý do từ chối"
              className="rounded-[18px] bg-[#FDEBEA] p-md text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
            >
              <p className="text-label">Lý do từ chối</p>
              <p className="mt-2xs whitespace-pre-line text-[16px] leading-6 text-text">
                {data.rejectionReason}
              </p>
            </section>
          ) : null}
        </div>
        <aside className="flex min-w-0 flex-col gap-md">
          <OrderFactsStrip
            facts={[
              { label: 'Khách hàng', value: data.customerName ?? 'Khách hàng' },
              ...(data.storefront.address
                ? [{ label: 'Điểm nhận món', value: data.storefront.address }]
                : []),
              ...(paid ? [{ label: 'Thanh toán', value: paid }] : []),
            ]}
          />
          {data.statusHistory.length ? (
            <section
              aria-label="Tiến trình"
              className="rounded-[18px] bg-card p-md shadow-card ring-1 ring-border/80"
            >
              <p className="mb-sm font-sign text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
                Tiến trình
              </p>
              <OrderTimeline history={data.statusHistory} current={data.orderStatus} />
            </section>
          ) : null}
          <NewOrdersHint />
        </aside>
      </div>

      {bodyFailure ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-[14px] bg-[#FDEBEA] px-md py-sm text-[16px] font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon
            name="alert-octagon-outline"
            size={20}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          <span className="text-error !text-[#8F1717] dark:!text-[#FF9A90]">{bodyFailure}</span>
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
        error={sheetFailure}
      />
    </Screen>
  );
}
