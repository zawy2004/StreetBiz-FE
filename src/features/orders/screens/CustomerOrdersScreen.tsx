import { useNavigate } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function CustomerOrdersScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const orders = useMockDb((s) => s.orders)
    .filter((o) => o.customerId === user?.id)
    .slice()
    .reverse();
  const storefronts = useMockDb((s) => s.storefronts);

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
        orders.map((o) => {
          const storefront = storefronts.find((st) => st.id === o.storefrontId);
          return (
            <Card key={o.id} onPress={() => navigate(`/customer/orders/${o.id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-headline-sm text-text">{storefront?.name}</span>
                  <span className="text-body-sm text-muted">#{o.order_code}</span>
                </div>
                <StatusChip code={o.order_status} />
              </div>
              <div className="mt-xs">
                <Money amountVnd={o.total} />
              </div>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
