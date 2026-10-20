import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, Money, Pagination, rangeCaption } from '@/components/common';
import { ErrorState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { OrderCard, OrderEmptyState } from '../components';
import { OfflineNotice, Perforation } from '../components/OrderShapes';
import { dayHeading, vietnamDayKey } from '../components/order-display';
import {
  ActiveOrderTicket,
  OrderDayHeading,
  OrderTicketSkeleton,
} from '../components/OrderTickets';
import { useCustomerOrders } from '../hooks/useOrders';
import { TERMINAL_ORDER_STATUSES, type Order, type OrderStatus } from '../types/order.types';

type CustomerTab =
  'ALL' | 'PENDING_PAYMENT' | 'PLACED' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CLOSED';

const CUSTOMER_FILTERS: { value: CustomerTab; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PLACED', label: 'Đã đặt' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'READY_FOR_PICKUP', label: 'Sẵn sàng nhận' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CLOSED', label: 'Đã hủy / từ chối' },
];

// What each tab asks the API for. Grouped tabs are filtered on the server, so
// the page count is about that tab rather than about every order.
const TAB_STATUSES: Record<CustomerTab, OrderStatus | readonly OrderStatus[] | undefined> = {
  ALL: undefined,
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PLACED: 'PLACED',
  PROCESSING: ['ACCEPTED', 'PREPARING'],
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  COMPLETED: 'COMPLETED',
  CLOSED: ['CANCELLED', 'REJECTED'],
};

const PAGE_SIZE = 10;

const updatedAt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
});

/** Orders of the page grouped by their calendar day (Asia/Ho_Chi_Minh), order kept. */
function groupByDay(orders: Order[]) {
  const groups: { key: string; orders: Order[] }[] = [];
  for (const order of orders) {
    const key = vietnamDayKey(order.placedAt ?? order.createdAt);
    const last = groups.at(-1);
    if (last && last.key === key) last.orders.push(order);
    else groups.push({ key, orders: [order] });
  }
  return groups;
}

/**
 * `/orders` is mounted outside the role shell, so the buyer's variant (the
 * editorial heading face) is set here too; inside the shell it is a no-op.
 */
function BuyerSurface({ children }: { children: ReactNode }) {
  return (
    <div data-surface="CUSTOMER" className="contents">
      {children}
    </div>
  );
}

export function CustomerOrdersScreen() {
  return (
    <BuyerSurface>
      {isLiveApi ? <LiveCustomerOrdersScreen /> : <MockCustomerOrdersScreen />}
    </BuyerSurface>
  );
}

function LiveCustomerOrdersScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<CustomerTab>('ALL');
  const [page, setPage] = useState(1);
  const orders = useCustomerOrders(
    { status: TAB_STATUSES[tab], page, pageSize: PAGE_SIZE },
    user?.role_code === 'CUSTOMER',
  );
  const totalPages = orders.data?.totalPages ?? 0;
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  if (user?.role_code !== 'CUSTOMER') {
    return (
      <Screen>
        <AppHeader title="Đơn hàng" />
        <OrderEmptyState
          title="Đăng nhập để xem đơn hàng"
          action={
            <Button label="Đăng nhập" fullWidth={false} onPress={() => navigate('/auth/sign-in')} />
          }
        />
      </Screen>
    );
  }
  const visible = orders.data?.items ?? [];
  const first = visible[0];
  const active = first && !TERMINAL_ORDER_STATUSES.has(first.orderStatus) ? first : null;
  const rest = active ? visible.slice(1) : visible;
  const days = groupByDay(rest);

  return (
    <Screen>
      <AppHeader
        title="Đơn hàng của tôi"
        right={
          <div className="flex items-center gap-xs">
            {orders.dataUpdatedAt ? (
              <span className="font-sign text-[13px] tabular-nums text-muted">
                Cập nhật lúc {updatedAt.format(orders.dataUpdatedAt)}
              </span>
            ) : null}
            <Button
              label="Làm mới"
              variant="ghost"
              fullWidth={false}
              icon={
                <span className={orders.isFetching ? 'inline-flex animate-spin' : 'inline-flex'}>
                  <Icon name="history" size={18} color="currentColor" />
                </span>
              }
              onPress={() => void orders.refetch()}
            />
          </div>
        }
      />
      <OfflineNotice message="Mất kết nối. Danh sách có thể chưa mới." />
      <div className="no-scrollbar -mx-md overflow-x-auto px-md pb-2xs [mask-image:linear-gradient(90deg,#000_88%,transparent)] md:-mx-lg md:px-lg lg:mx-0 lg:px-0 lg:[mask-image:none]">
        <div className="min-w-[760px] [&_[role=tab]]:h-11">
          <SegmentedControl
            value={tab}
            onChange={(value) => {
              setTab(value);
              setPage(1);
            }}
            options={CUSTOMER_FILTERS}
          />
        </div>
      </div>
      {orders.isPending ? (
        <OrderTicketSkeleton />
      ) : orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : visible.length === 0 ? (
        <OrderEmptyState />
      ) : (
        <div
          className={`flex flex-col gap-lg transition-opacity duration-150 ${
            orders.isPlaceholderData ? 'opacity-60' : ''
          }`}
        >
          {active ? (
            <ActiveOrderTicket
              order={active}
              onOpen={() => navigate(`/customer/orders/${active.orderId}`)}
              onContinuePayment={
                active.orderStatus === 'PENDING_PAYMENT'
                  ? () => navigate(`/customer/orders/${active.orderId}/payment`)
                  : undefined
              }
            />
          ) : null}
          {active && rest.length === 0 ? (
            <p className="flex items-start gap-xs rounded-[16px] bg-sunken/70 px-md py-sm text-body-md text-muted">
              <Icon
                name="information-outline"
                size={18}
                color="currentColor"
                className="mt-0.5 shrink-0"
              />
              Đơn đã thanh toán sẽ hiện ở đây cho tới khi bạn nhận món tại quầy.
            </p>
          ) : null}
          {days.map((day) => (
            <section key={day.key} className="flex flex-col gap-sm">
              <OrderDayHeading>
                {dayHeading(day.key)} · {day.orders.length} đơn
              </OrderDayHeading>
              <div className="grid gap-md lg:grid-cols-2">
                {day.orders.map((order, index) => (
                  <div
                    key={order.orderId}
                    className="sb-rise min-w-0"
                    style={{ '--delay': `${Math.min(index, 6) * 40}ms` } as CSSProperties}
                  >
                    <OrderCard
                      order={order}
                      onPress={() => navigate(`/customer/orders/${order.orderId}`)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {orders.data && totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          busy={orders.isPlaceholderData}
          onChange={setPage}
          caption={rangeCaption('Đơn', page, PAGE_SIZE, orders.data.totalItems, visible.length)}
        />
      ) : null}
    </Screen>
  );
}

function MockCustomerOrdersScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const orders = useMockDb((state) => state.orders)
    .filter((order) => order.customerId === user?.id)
    .slice()
    .reverse();
  const storefronts = useMockDb((state) => state.storefronts);
  if (!user) {
    return (
      <Screen>
        <AppHeader title="Đơn hàng" />
        <OrderEmptyState
          title="Đăng nhập để xem đơn hàng"
          action={
            <Button label="Đăng nhập" fullWidth={false} onPress={() => navigate('/auth/sign-in')} />
          }
        />
      </Screen>
    );
  }
  return (
    <Screen>
      <AppHeader title="Đơn hàng của tôi" />
      {orders.length === 0 ? (
        <OrderEmptyState title="Chưa có đơn hàng nào" />
      ) : (
        <div className="grid gap-md lg:grid-cols-2">
          {orders.map((order) => {
            const storefront = storefronts.find((row) => row.id === order.storefrontId);
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => navigate(`/customer/orders/${order.id}`)}
                className="flex flex-col rounded-[20px] bg-card text-left shadow-card ring-1 ring-border/80 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row"
              >
                <span className="min-w-0 flex-1 p-md">
                  <span className="block truncate font-editorial text-[19px] font-semibold text-text">
                    {storefront?.name}
                  </span>
                  <span className="font-sign text-body-sm font-semibold text-muted">
                    #{order.order_code}
                  </span>
                </span>
                <Perforation className="sm:hidden" />
                <Perforation vertical className="hidden sm:block" />
                <span className="flex items-center justify-between gap-sm rounded-b-[20px] bg-[#FFF3E8] px-md py-sm dark:bg-[#2A2420] sm:w-[150px] sm:flex-col sm:items-start sm:justify-center sm:rounded-b-none sm:rounded-r-[20px]">
                  <Money amountVnd={order.total} />
                  <StatusChip code={order.order_status} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
