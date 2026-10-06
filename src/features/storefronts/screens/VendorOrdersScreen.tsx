import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, type IconName, Pagination, rangeCaption } from '@/components/common';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { ApiError } from '@/core/api/problem';
import { orderApi } from '@/features/orders/api/orderApi';
import { useVendorArrivals } from '@/features/orders/hooks/useOrderTracking';
import {
  OrderListSkeleton,
  OrderPipeline,
  RejectOrderDialog,
  VendorOrderTicket,
  type PipelineStage,
  type StageTone,
} from '@/features/orders/components';
import {
  orderKeys,
  useVendorOrderCounts,
  useVendorOrders,
  VENDOR_ORDERS_REFRESH_MS,
} from '@/features/orders/hooks/useOrders';
import type { Order, OrderStatus } from '@/features/orders/types/order.types';

type Stage = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP';
type VendorTab = Stage | 'COMPLETED' | 'CLOSED';

// The order's way through the stall, left to right. Each stage has its own
// colour: chili for what just came in, turmeric for what is cooking, leaf for
// what is ready.
const STAGES: { value: Stage; label: string; tone: StageTone }[] = [
  { value: 'PLACED', label: 'Đơn mới', tone: 'chili' },
  { value: 'ACCEPTED', label: 'Đã nhận', tone: 'ink' },
  { value: 'PREPARING', label: 'Đang làm', tone: 'turmeric' },
  { value: 'READY_FOR_PICKUP', label: 'Chờ lấy', tone: 'leaf' },
];
const STAGE_STATUSES = STAGES.map((stage) => stage.value);

const HISTORY: { value: VendorTab; label: string }[] = [
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CLOSED', label: 'Từ chối / hủy' },
];

const PAGE_SIZE = 10;
const REFRESH_NOTE = `Tự cập nhật mỗi ${VENDOR_ORDERS_REFRESH_MS / 1000} giây`;

// What each tab asks the API for. "Closed" groups two statuses, and is filtered
// on the server so the page count is about closed orders alone.
const TAB_STATUSES: Record<VendorTab, OrderStatus | readonly OrderStatus[]> = {
  PLACED: 'PLACED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  COMPLETED: 'COMPLETED',
  CLOSED: ['REJECTED', 'CANCELLED'],
};

// One line under the stages saying what the selected one holds and what the
// seller does about it - the button names match the buttons on the tickets.
const TAB_GUIDE: Record<VendorTab, string> = {
  PLACED: 'Khách đã thanh toán. Bấm "Nhận đơn" để khách biết quán đang làm.',
  ACCEPTED: 'Đơn đã nhận, chưa bắt đầu làm.',
  PREPARING: 'Làm xong thì bấm "Sẵn sàng lấy món" để báo khách tới lấy.',
  READY_FOR_PICKUP: 'Khách tới thì quét mã nhận hàng trên máy khách để giao đơn.',
  COMPLETED: 'Đơn đã giao tận tay khách.',
  CLOSED: 'Đơn bạn đã từ chối hoặc khách đã hủy.',
};

const EMPTY: Record<VendorTab, { icon: IconName; title: string; description: string }> = {
  PLACED: {
    icon: 'inbox-outline',
    title: 'Chưa có đơn mới',
    description: `Đơn khách vừa thanh toán sẽ hiện ở đây. ${REFRESH_NOTE}.`,
  },
  ACCEPTED: {
    icon: 'check-circle-outline',
    title: 'Không có đơn chờ làm',
    description: 'Đơn bạn đã nhận nằm ở đây cho tới khi bắt đầu chuẩn bị.',
  },
  PREPARING: {
    icon: 'fire',
    title: 'Bếp đang trống',
    description: 'Đơn bạn đang làm sẽ hiện ở đây.',
  },
  READY_FOR_PICKUP: {
    icon: 'qrcode-scan',
    title: 'Không có đơn chờ khách lấy',
    description: 'Đơn đã làm xong sẽ chờ ở đây tới khi bạn quét mã của khách.',
  },
  COMPLETED: {
    icon: 'receipt-text-outline',
    title: 'Chưa có đơn hoàn thành',
    description: 'Đơn giao xong sẽ được lưu ở đây.',
  },
  CLOSED: {
    icon: 'receipt-text-outline',
    title: 'Không có đơn bị từ chối hay hủy',
    description: 'Đơn bạn từ chối hoặc khách hủy sẽ được lưu ở đây.',
  },
};

// Handover goes through the scanner, never through a list-row mutation.
type Action = { kind: 'accept' | 'reject' | 'preparing' | 'ready'; order: Order; reason?: string };

/** A clock for the "waiting 12 minutes" chips, ticking between list refreshes. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function VendorOrdersScreen() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [tab, setTab] = useState<VendorTab>('PLACED');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [reason, setReason] = useState('');
  const now = useNow(30_000);
  const orders = useVendorOrders({ status: TAB_STATUSES[tab], page, pageSize: PAGE_SIZE });
  // ORD-02 "Tôi đang đến": customers on their way, shown on their tickets.
  const arrivals = useVendorArrivals();
  const counts = useVendorOrderCounts(STAGE_STATUSES);
  const totalPages = orders.data?.totalPages ?? 0;
  const live = tab !== 'COMPLETED' && tab !== 'CLOSED';

  // Accepting the last order on the last page empties that page: step back to
  // the new last page rather than showing "no orders" with orders still left.
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openTab = (next: VendorTab) => {
    setTab(next);
    setPage(1);
  };

  const transition = useMutation({
    mutationFn: ({ kind, order, reason: rejectionReason }: Action) => {
      if (kind === 'accept') return orderApi.accept(order.orderId);
      if (kind === 'reject') return orderApi.reject(order.orderId, rejectionReason!.trim());
      if (kind === 'preparing') return orderApi.preparing(order.orderId);
      return orderApi.readyForPickup(order.orderId);
    },
    onSuccess: async (updated, action) => {
      cache.setQueryData(orderKeys.vendorDetail(updated.orderId), updated);
      await Promise.all([
        cache.invalidateQueries({ queryKey: orderKeys.vendorLists }),
        cache.invalidateQueries({ queryKey: ['orders', 'vendor', 'sales'] }),
      ]);
      setRejecting(null);
      setReason('');
      showToast(
        {
          accept: 'Đã nhận đơn. Đơn chuyển sang "Đã nhận".',
          preparing: 'Đã bắt đầu làm. Đơn chuyển sang "Đang làm".',
          ready: 'Đã báo khách tới lấy. Đơn chuyển sang "Chờ lấy".',
          reject: 'Đã từ chối đơn; yêu cầu hoàn tiền đang được xử lý.',
        }[action.kind],
      );
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await cache.invalidateQueries({ queryKey: orderKeys.vendorLists });
        showToast('Trạng thái đơn đã thay đổi. Danh sách vừa được tải lại.');
      }
    },
  });

  // Only the ticket being acted on spins; the rest stay usable to read.
  const acting = transition.isPending ? transition.variables?.order.orderId : undefined;

  const stages: PipelineStage<VendorTab>[] = STAGES.map((stage) => ({
    ...stage,
    count: counts[stage.value],
  }));

  const ticketActions = (order: Order) => {
    const busy = acting === order.orderId;
    const details = (
      <Button
        label="Chi tiết"
        variant="outline"
        fullWidth={false}
        onPress={() => navigate(`/vendor/orders/${order.orderId}`)}
      />
    );
    switch (order.orderStatus) {
      case 'PLACED':
        return {
          primary: (
            <Button
              label="Nhận đơn"
              variant="approve"
              loading={busy && transition.variables?.kind === 'accept'}
              disabled={transition.isPending}
              onPress={() => transition.mutate({ kind: 'accept', order })}
            />
          ),
          secondary: (
            <>
              {details}
              <button
                type="button"
                disabled={transition.isPending}
                onClick={() => {
                  setRejecting(order);
                  setReason('');
                }}
                className="h-12 rounded-sm px-sm text-label font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-45"
              >
                Từ chối
              </button>
            </>
          ),
        };
      case 'ACCEPTED':
        return {
          primary: (
            <Button
              label="Bắt đầu chuẩn bị"
              loading={busy}
              disabled={transition.isPending}
              onPress={() => transition.mutate({ kind: 'preparing', order })}
            />
          ),
          secondary: details,
        };
      case 'PREPARING':
        return {
          primary: (
            <Button
              label="Sẵn sàng lấy món"
              variant="approve"
              loading={busy}
              disabled={transition.isPending}
              onPress={() => transition.mutate({ kind: 'ready', order })}
            />
          ),
          secondary: details,
        };
      case 'READY_FOR_PICKUP':
        // ORD-06: handing over needs the buyer's code, so this opens the
        // scanner instead of completing the order from a list row.
        return {
          primary: (
            <Button
              label="Quét mã để giao"
              icon={<Icon name="qrcode-scan" size={20} />}
              onPress={() => navigate('/vendor/orders/scan')}
            />
          ),
          secondary: details,
        };
      default:
        return { primary: undefined, secondary: details };
    }
  };

  const tone = (order: Order): StageTone =>
    STAGES.find((stage) => stage.value === order.orderStatus)?.tone ?? 'quiet';
  const items = orders.data?.items ?? [];
  const empty = EMPTY[tab];

  return (
    <Screen width="wide">
      <AppHeader
        title="Đơn hàng"
        subtitle={orders.isFetching && !orders.isPending ? 'Đang cập nhật…' : REFRESH_NOTE}
        right={
          <div className="flex items-center gap-xs">
            <div className="hidden sm:block">
              <Button
                label="Quét mã nhận hàng"
                size="sm"
                fullWidth={false}
                icon={<Icon name="qrcode-scan" size={18} />}
                onPress={() => navigate('/vendor/orders/scan')}
              />
            </div>
            <Button
              label="Làm mới"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => void cache.invalidateQueries({ queryKey: orderKeys.vendorLists })}
            />
          </div>
        }
      />

      {/* On a phone the scanner is the one big button: a buyer at the stall is
          the moment this screen is most often opened for. */}
      <div className="sm:hidden">
        <Button
          label="Quét mã nhận hàng của khách"
          icon={<Icon name="qrcode-scan" size={20} />}
          onPress={() => navigate('/vendor/orders/scan')}
        />
      </div>

      <section className="flex flex-col gap-sm">
        <OrderPipeline label="Đơn đang xử lý" stages={stages} value={tab} onChange={openTab} />
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <p className="text-body-md text-muted">{TAB_GUIDE[tab]}</p>
          <div role="tablist" aria-label="Lịch sử đơn" className="flex items-center gap-2xs">
            <span className="pr-2xs text-body-sm text-muted">Lịch sử</span>
            {HISTORY.map((entry) => (
              <button
                key={entry.value}
                type="button"
                role="tab"
                aria-selected={tab === entry.value}
                onClick={() => openTab(entry.value)}
                className={[
                  'h-9 rounded-full border px-sm text-label transition-colors',
                  tab === entry.value
                    ? 'border-text bg-text font-semibold text-bg'
                    : 'border-border bg-card text-text hover:bg-sunken',
                ].join(' ')}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {transition.isError &&
      !(transition.error instanceof ApiError && transition.error.status === 409) ? (
        <p role="alert" className="rounded-sm bg-error/10 px-sm py-xs text-body-md text-error">
          {errorMessage(transition.error)}
        </p>
      ) : null}

      {orders.isPending ? (
        <OrderListSkeleton />
      ) : orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
      ) : (
        <div className="grid gap-md lg:grid-cols-2">
          {items.map((order) => {
            const actions = ticketActions(order);
            return (
              <VendorOrderTicket
                key={order.orderId}
                order={order}
                tone={tone(order)}
                live={live}
                // Only the closed tab mixes statuses; elsewhere the tab says it.
                showStatus={tab === 'CLOSED'}
                now={now}
                primaryAction={actions.primary}
                secondaryActions={actions.secondary}
                arrival={arrivals.get(order.orderId)}
              />
            );
          })}
        </div>
      )}

      {orders.data && totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          busy={orders.isPlaceholderData}
          onChange={setPage}
          caption={rangeCaption('Đơn', page, PAGE_SIZE, orders.data.totalItems, items.length)}
        />
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
    </Screen>
  );
}
