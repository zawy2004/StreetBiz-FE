import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';

type SalesPeriod = 'DAY' | 'WEEK' | 'MONTH';

export function SalesSummaryScreen() {
  return isLiveApi ? <LiveSalesSummaryScreen /> : <MockSalesSummaryScreen />;
}

function LiveSalesSummaryScreen() {
  const [period, setPeriod] = useState<SalesPeriod>('DAY');
  const summary = useQuery({
    queryKey: ['commerce', 'sales-summary', period],
    queryFn: () => commerceApi.salesSummary(period),
  });

  if (summary.isPending) return <LoadingState />;
  if (summary.isError) {
    return <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />;
  }

  const data = summary.data;
  return (
    <Screen>
      <AppHeader title="Doanh thu" back subtitle="Chỉ tính các đơn đã hoàn tất" />
      <SegmentedControl
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'DAY', label: 'Hôm nay' },
          { value: 'WEEK', label: 'Tuần này' },
          { value: 'MONTH', label: 'Tháng này' },
        ]}
      />
      <Card style={{ backgroundColor: colors.indigo }}>
        <div className="flex flex-col gap-2xs">
          <span className="text-body-md" style={{ color: '#C7CCDB' }}>
            Doanh thu thuần
          </span>
          <Money amountVnd={data.netSales} size="lg" color={colors.white} />
          <span className="text-body-sm" style={{ color: '#C7CCDB' }}>
            {data.completedOrderCount} đơn · {new Date(data.fromUtc).toLocaleDateString('vi-VN')} –{' '}
            {new Date(data.toUtc).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-sm">
          <span className="text-body-md text-muted">Doanh số gộp</span>
          <Money amountVnd={data.grossSales} />
        </div>
        <div className="mt-xs flex items-center justify-between gap-sm">
          <span className="text-body-md text-muted">Đã hoàn tiền</span>
          <Money amountVnd={data.refundedAmount} />
        </div>
      </Card>
      {data.orders.length === 0 ? (
        <EmptyState icon="chart-line" title="Chưa có đơn hoàn tất trong kỳ" />
      ) : (
        data.orders.map((order) => (
          <Card key={order.orderId}>
            <div className="flex items-center justify-between gap-sm">
              <div className="min-w-0 flex-1">
                <span className="block text-body-md text-text">#{order.orderCode}</span>
                <span className="block truncate text-body-sm text-muted">{order.customerName}</span>
              </div>
              <Money amountVnd={order.totalAmount} />
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}

function MockSalesSummaryScreen() {
  const user = useAuthStore((state) => state.user);
  const storefront = useMockDb((state) =>
    state.storefronts.find((row) => row.vendorId === user?.vendorId),
  );
  const orders = useMockDb((state) => state.orders).filter(
    (order) => order.storefrontId === storefront?.id && order.order_status === 'PICKED_UP',
  );
  const total = orders.reduce((sum, order) => sum + order.total, 0);

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
        orders.map((order) => (
          <Card key={order.id}>
            <div className="flex items-center justify-between">
              <span className="text-body-md text-text">#{order.order_code}</span>
              <Money amountVnd={order.total} />
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
