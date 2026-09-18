import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function CustomerOrdersScreen() {
  return isLiveApi ? <LiveCustomerOrdersScreen /> : <MockCustomerOrdersScreen />;
}

function LiveCustomerOrdersScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const orders = useQuery({
    queryKey: ['commerce', 'customer-orders'],
    queryFn: commerceApi.customerOrders,
    enabled: user?.role_code === 'CUSTOMER',
    refetchInterval: 10_000,
  });
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
  if (orders.isPending) return <LoadingState />;
  if (orders.isError) {
    return <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />;
  }

  return (
    <Screen>
      <AppHeader title="Đơn hàng của tôi" />
      {orders.data.length === 0 ? (
        <EmptyState icon="receipt-text-outline" title="Chưa có đơn hàng nào" />
      ) : (
        orders.data.map((order) => (
          <Card key={order.orderId} onPress={() => navigate(`/customer/orders/${order.orderId}`)}>
            <div className="flex items-center justify-between gap-sm">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-headline-sm text-text">
                  {order.storefrontName}
                </span>
                <span className="text-body-sm text-muted">#{order.orderCode}</span>
              </div>
              <StatusChip code={order.orderStatus} />
            </div>
            <div className="mt-xs">
              <Money amountVnd={order.totalAmount} />
            </div>
          </Card>
        ))
      )}
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
