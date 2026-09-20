import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { EmptyState, ErrorState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { OrderCard, OrderEmptyState, OrderListSkeleton } from '../components';
import { useCustomerOrders } from '../hooks/useOrders';
import type { OrderStatus } from '../types/order.types';

type CustomerTab =
  | 'ALL'
  | 'PENDING_PAYMENT'
  | 'PLACED'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CLOSED';

const CUSTOMER_FILTERS: { value: CustomerTab; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PLACED', label: 'Đã đặt' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'READY_FOR_PICKUP', label: 'Sẵn sàng nhận' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CLOSED', label: 'Đã hủy / từ chối' },
];

export function CustomerOrdersScreen() {
  return isLiveApi ? <LiveCustomerOrdersScreen /> : <MockCustomerOrdersScreen />;
}

function LiveCustomerOrdersScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<CustomerTab>('ALL');
  const [page, setPage] = useState(1);
  const directStatus = ['PENDING_PAYMENT', 'PLACED', 'READY_FOR_PICKUP', 'COMPLETED'].includes(tab)
    ? (tab as OrderStatus)
    : undefined;
  const orders = useCustomerOrders(
    { status: directStatus, page, pageSize: 10 },
    user?.role_code === 'CUSTOMER',
  );
  if (user?.role_code !== 'CUSTOMER') {
    return (
      <Screen>
        <AppHeader title="Đơn hàng" />
        <EmptyState
          icon="login"
          title="Đăng nhập để xem đơn hàng"
          action={<Button label="Đăng nhập" onPress={() => navigate('/auth/sign-in')} />}
        />
      </Screen>
    );
  }
  const visible = (orders.data?.items ?? []).filter((order) => {
    if (tab === 'PROCESSING') return ['ACCEPTED', 'PREPARING'].includes(order.orderStatus);
    if (tab === 'CLOSED') return ['CANCELLED', 'REJECTED'].includes(order.orderStatus);
    return true;
  });

  return (
    <Screen>
      <AppHeader
        title="Đơn hàng của tôi"
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
        <div className="min-w-[760px]">
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
        <OrderListSkeleton />
      ) : orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : visible.length === 0 ? (
        <OrderEmptyState />
      ) : (
        visible.map((order) => (
          <OrderCard
            key={order.orderId}
            order={order}
            onPress={() => navigate(`/customer/orders/${order.orderId}`)}
          />
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
        <EmptyState
          icon="login"
          title="Đăng nhập để xem đơn hàng"
          action={<Button label="Đăng nhập" onPress={() => navigate('/auth/sign-in')} />}
        />
      </Screen>
    );
  }
  return (
    <Screen>
      <AppHeader title="Đơn hàng của tôi" />
      {orders.length === 0 ? (
        <EmptyState icon="receipt-text-outline" title="Chưa có đơn hàng nào" />
      ) : (
        orders.map((order) => {
          const storefront = storefronts.find((row) => row.id === order.storefrontId);
          return (
            <Card key={order.id} onPress={() => navigate(`/customer/orders/${order.id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-headline-sm text-text">{storefront?.name}</span>
                  <span className="text-body-sm text-muted">#{order.order_code}</span>
                </div>
                <StatusChip code={order.order_status} />
              </div>
              <div className="mt-xs">
                <Money amountVnd={order.total} />
              </div>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
