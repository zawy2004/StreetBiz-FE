import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function SalesSummaryScreen() {
  const user = useAuthStore((s) => s.user);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === user?.vendorId));
  const orders = useMockDb((s) => s.orders).filter(
    (o) => o.storefrontId === storefront?.id && o.order_status === 'PICKED_UP',
  );

  const total = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <Screen>
      <AppHeader title="Doanh thu" back />
      <Card style={{ backgroundColor: colors.indigo }}>
        <div className="flex flex-col gap-2xs">
          <span className="text-body-md" style={{ color: '#C7CCDB' }}>
            Doanh thu đã hoàn tất
          </span>
          <Money amountVnd={total} size="lg" color={colors.white} />
          <span className="text-body-sm" style={{ color: '#C7CCDB' }}>
            {orders.length} đơn hàng
          </span>
        </div>
      </Card>
      {orders.length === 0 ? (
        <EmptyState icon="chart-line" title="Chưa có đơn hoàn tất" />
      ) : (
        orders.map((o) => (
          <Card key={o.id}>
            <div className="flex items-center justify-between">
              <span className="text-body-md text-text">#{o.order_code}</span>
              <Money amountVnd={o.total} />
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
