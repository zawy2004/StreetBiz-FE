import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon, Money } from '@/components/common';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { orderApi } from '../api/orderApi';
import {
  OrderItemsList,
  OrderPickupQr,
  OrderStatusBadge,
  OrderSummary,
  OrderTimeline,
  formatOrderDate,
} from '../components';
import {
  OrderDetailSkeleton,
  OrderNextStep,
  OrderReceipt,
  RefundPanel,
  RefundStamp,
} from '../components/OrderDetailParts';
import { LiveDot, OfflineNotice, Perforation } from '../components/OrderShapes';
import {
  SCALLOP_BOTTOM,
  providerName,
  refundPresentation,
  upcomingStages,
} from '../components/order-display';
import { useCustomerOrder, useRefreshAfterOrderMutation } from '../hooks/useOrders';
import { COLLECTABLE_ORDER_STATUSES, TERMINAL_ORDER_STATUSES } from '../types/order.types';

export function OrderDetailScreen() {
  return isLiveApi ? <LiveOrderDetailScreen /> : <MockOrderDetailScreen />;
}

/**
 * Two columns on a desktop (receipt left, journey right). On a phone the
 * column wrappers dissolve (`contents`) and the pieces are ordered for the
 * counter: the pickup stub first, then the journey, the receipt, the rest.
 */
const COLUMN = 'contents lg:flex lg:min-w-0 lg:flex-col';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <p className="mb-md font-sign text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        {title}
      </p>
      {children}
    </section>
  );
}

function LiveOrderDetailScreen() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const order = useCustomerOrder(orderId);
  const refresh = useRefreshAfterOrderMutation('customer', Number(orderId));
  const transition = useMutation({
    mutationFn: () => orderApi.cancel(order.data!.orderId),
    onSuccess: async (next) => {
      setConfirmCancel(false);
      await refresh.update(next);
      showToast('Đã huỷ đơn; yêu cầu hoàn tiền đang được xử lý nếu đã thanh toán');
    },
    onError: refresh.handleError,
  });
  if (order.isPending) {
    return (
      <Screen>
        <AppHeader title="Đơn hàng" back />
        <OrderDetailSkeleton />
      </Screen>
    );
  }
  if (order.isError || !order.data) {
    return (
      <Screen>
        <AppHeader title="Đơn hàng" back />
        <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />
      </Screen>
    );
  }

  const data = order.data;
  const canCancel = data.orderStatus === 'PLACED';
  const refund = data.refundStatus ? refundPresentation(data.refundStatus) : null;
  const pending = data.orderStatus === 'PENDING_PAYMENT';
  const collectable = COLLECTABLE_ORDER_STATUSES.has(data.orderStatus);
  const live = !TERMINAL_ORDER_STATUSES.has(data.orderStatus);
  const canComplain =
    data.paymentStatus === 'SUCCESS' && !['PENDING_PAYMENT', 'PLACED'].includes(data.orderStatus);
  const canReview = data.orderStatus === 'COMPLETED';

  return (
    <Screen
      footer={
        canCancel ? (
          <StickyActions>
            {canCancel ? (
              <div className="w-full [&>button]:text-error">
                <Button
                  label="Huỷ đơn"
                  variant="outline"
                  disabled={transition.isPending}
                  onPress={() => setConfirmCancel(true)}
                />
              </div>
            ) : null}
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={`#${data.orderCode}`} back subtitle={data.storefront.storefrontName} />
      <OfflineNotice message="Mất kết nối. Trạng thái đơn có thể chưa mới." />

      <section aria-live="polite" className="flex flex-col gap-sm">
        {pending ? (
          <div className="flex flex-col gap-sm rounded-[20px] bg-[#FFF3D1] p-md text-[#6B4100] ring-1 ring-[#6B4100]/15 dark:bg-[#3A2A08] dark:text-[#FFD27A] md:flex-row md:items-center md:p-lg">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card/80">
              <Icon name="clock-outline" size={24} color="currentColor" weight="fill" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-editorial text-[24px] font-semibold leading-tight">
                Đang chờ xác nhận thanh toán
              </p>
              <p className="mt-2xs text-body-md">
                Trạng thái chỉ thay đổi sau khi backend nhận callback hợp lệ từ cổng thanh toán.
              </p>
            </div>
            <div className="md:w-[220px]">
              <Button
                label="Kiểm tra thanh toán"
                variant="outline"
                onPress={() => navigate(`/customer/orders/${data.orderId}/payment`)}
              />
            </div>
          </div>
        ) : (
          <OrderNextStep
            status={data.orderStatus}
            aside={live ? <LiveDot>Tự cập nhật</LiveDot> : undefined}
          />
        )}
        <div className="flex flex-wrap items-center gap-sm">
          <OrderStatusBadge status={data.orderStatus} />
          {data.paymentStatus ? <StatusChip code={data.paymentStatus} /> : null}
          {pending && live ? <LiveDot>Tự cập nhật</LiveDot> : null}
        </div>
      </section>

      <div className="flex flex-col gap-lg lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className={COLUMN}>
          {collectable ? (
            <div className="order-1 lg:order-none">
              <OrderPickupQr order={data} />
            </div>
          ) : pending ? (
            <div className="order-1 flex flex-col items-center gap-sm rounded-[28px] border-2 border-dashed border-[#FFB703]/70 bg-card px-md py-lg text-center lg:order-none lg:mb-md">
              <Icon name="qrcode" size={40} color="rgb(var(--c-muted))" weight="duotone" />
              <p className="max-w-[30ch] text-body-md text-muted">
                Mã sẽ hiện khi thanh toán được xác nhận
              </p>
            </div>
          ) : null}
          <div className="order-3 lg:order-none">
            <OrderReceipt order={data} attached={collectable}>
              <p className="font-sign text-[15px] font-semibold tracking-[0.02em] text-text [font-stretch:80%]">
                #{data.orderCode}
              </p>
              <OrderItemsList items={data.items} />
              <div className="relative">
                <OrderSummary subtotal={data.subtotalAmount} total={data.totalAmount} />
                {data.refundStatus === 'SUCCESS' ? (
                  <RefundStamp className="absolute -top-6 right-0 h-[104px] w-[104px] md:right-sm" />
                ) : null}
              </div>
              <div className="flex flex-col gap-0.5 border-t border-dashed border-border pt-sm">
                <p className="text-body-sm text-muted">
                  {providerName(data.paymentProvider) ?? 'Chưa chọn cổng'} · Tạo lúc{' '}
                  {formatOrderDate(data.createdAt)}
                </p>
                {data.placedAt ? (
                  <p className="text-body-sm text-muted">
                    Đặt lúc {formatOrderDate(data.placedAt)}
                  </p>
                ) : null}
                {data.completedAt ? (
                  <p className="text-body-sm text-muted">
                    Hoàn tất lúc {formatOrderDate(data.completedAt)}
                  </p>
                ) : null}
              </div>
            </OrderReceipt>
          </div>
        </div>

        <div className={`${COLUMN} lg:gap-lg`}>
          <div className="order-2 lg:order-none">
            <Panel title="Hành trình đơn">
              <OrderTimeline
                history={data.statusHistory}
                current={data.orderStatus}
                upcoming={upcomingStages(data.orderStatus)}
              />
            </Panel>
          </div>
          {data.rejectionReason ? (
            <section
              aria-label="Lý do từ chối"
              className="order-4 rounded-[20px] bg-[#FDEBEA] p-md text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90] md:p-lg lg:order-none"
            >
              <p className="text-label">Lý do từ chối</p>
              <p className="mt-2xs whitespace-pre-line text-body-md text-text">
                {data.rejectionReason}
              </p>
            </section>
          ) : null}
          {refund ? (
            <div className="order-4 lg:order-none">
              <RefundPanel
                label={refund.label}
                tone={refund.tone}
                message={refund.message}
                amount={data.refundAmount}
                requestedAt={data.refundRequestedAt}
              />
            </div>
          ) : null}
          {canComplain || canReview ? (
            <section
              aria-label="Việc bạn có thể làm"
              className="order-5 flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg lg:order-none"
            >
              <p className="font-sign text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
                Việc bạn có thể làm
              </p>
              <div className="grid gap-sm sm:grid-cols-2">
                {canComplain ? (
                  <Button
                    label="Khiếu nại / Yêu cầu hoàn tiền"
                    variant="outline"
                    onPress={() => navigate(`/customer/orders/${data.orderId}/complaint`)}
                  />
                ) : null}
                {canReview ? (
                  <Button
                    label="Đánh giá đơn hàng"
                    variant="outline"
                    onPress={() => navigate(`/customer/orders/${data.orderId}/review`)}
                  />
                ) : null}
              </div>
            </section>
          ) : null}
          {transition.isError ? (
            <p className="order-6 text-body-md text-error lg:order-none">
              {errorMessage(transition.error)}
            </p>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        visible={confirmCancel}
        title="Huỷ đơn hàng?"
        description="Chỉ đơn chưa được người bán nhận mới có thể huỷ. Nếu đã thanh toán, Backend sẽ tạo yêu cầu hoàn tiền."
        confirmLabel="Huỷ đơn"
        confirmVariant="danger"
        onConfirm={() => transition.mutate()}
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
  if (!order) {
    return (
      <Screen>
        <AppHeader title="Đơn hàng" back />
        <ErrorState message="Không tìm thấy đơn hàng." />
      </Screen>
    );
  }
  const canCancel = ['PENDING', 'ACCEPTED'].includes(order.order_status);
  const canConfirmPickup = order.order_status === 'READY_FOR_PICKUP';
  const isDone = order.order_status === 'PICKED_UP';

  return (
    <Screen
      width="narrow"
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
      <div className="drop-shadow-[0_22px_30px_rgb(17_28_43/0.12)] dark:drop-shadow-none">
        <article
          aria-label="Biên nhận"
          style={SCALLOP_BOTTOM}
          className="flex flex-col gap-md rounded-t-[28px] bg-card px-md pb-xl pt-lg ring-1 ring-border md:px-lg"
        >
          <p className="font-editorial text-[22px] font-semibold leading-7 text-text">
            {storefront?.name}
          </p>
          <ul className="flex flex-col gap-sm">
            {order.items.map((item) => (
              <li key={item.menuItemId} className="flex items-end gap-xs">
                <span className="text-[15px] font-medium text-text">{`${item.quantity}× ${item.name}`}</span>
                <span
                  aria-hidden="true"
                  className="mb-1.5 flex-1 border-b-2 border-dotted border-border"
                />
                <Money amountVnd={item.price * item.quantity} />
              </li>
            ))}
          </ul>
          <Perforation notchClass="bg-bg" className="-mx-md md:-mx-lg" />
          <div className="flex items-center justify-between">
            <span className="text-headline-sm text-text">Tổng đã thanh toán</span>
            <Money amountVnd={order.total} size="lg" />
          </div>
        </article>
      </div>
      {order.order_status === 'REJECTED' || order.order_status === 'CANCELLED' ? (
        <p className="rounded-[16px] bg-[#E6F6EC] px-md py-sm text-body-md font-medium text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
          Đã tạo yêu cầu hoàn tiền.
        </p>
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
