import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button, Card, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { orderApi } from '@/features/orders/api/orderApi';
import { orderKeys } from '@/features/orders/hooks/useOrders';
import type { SalesGroup } from '@/features/orders/types/order.types';
import { alpha, colors } from '@/theme';

function dateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toUtc(value: string, endOfDay = false): string {
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}+07:00`).toISOString();
}

export function SalesSummaryScreen() {
  const now = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(() => {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return dateInput(from);
  });
  const [toDate, setToDate] = useState(() => dateInput(now));
  const [groupBy, setGroupBy] = useState<SalesGroup>('day');
  const fromUtc = toUtc(fromDate);
  const toUtcValue = toUtc(toDate, true);
  const summary = useQuery({
    queryKey: orderKeys.sales(fromUtc, toUtcValue, groupBy),
    queryFn: () => orderApi.salesSummary(fromUtc, toUtcValue, groupBy),
    enabled: fromDate <= toDate,
  });

  const average = summary.data?.completedOrderCount
    ? summary.data.netSales / summary.data.completedOrderCount
    : 0;

  return (
    <Screen>
      <AppHeader
        title="Doanh thu"
        back
        subtitle="Chỉ sử dụng số liệu đơn COMPLETED do backend trả về"
        right={
          <Button
            label="Làm mới"
            variant="ghost"
            fullWidth={false}
            onPress={() => void summary.refetch()}
          />
        }
      />
      <Card>
        <div className="grid gap-sm sm:grid-cols-2">
          <label className="flex flex-col gap-2xs text-label text-text">
            Từ ngày
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-12 rounded-sm border border-border bg-card px-sm text-body-md"
            />
          </label>
          <label className="flex flex-col gap-2xs text-label text-text">
            Đến ngày
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-12 rounded-sm border border-border bg-card px-sm text-body-md"
            />
          </label>
        </div>
        <div className="mt-sm">
          <SegmentedControl
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { value: 'day', label: 'Theo ngày' },
              { value: 'week', label: 'Theo tuần' },
              { value: 'month', label: 'Theo tháng' },
            ]}
          />
        </div>
      </Card>

      {fromDate > toDate ? (
        <p role="alert" className="text-body-md text-error">Từ ngày không được sau đến ngày.</p>
      ) : summary.isPending ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />
      ) : summary.data ? (
        <>
          <Card className="!border-transparent !bg-indigo">
            <p className="text-body-md" style={{ color: alpha(colors.onIndigo, 0.72) }}>Doanh thu thuần</p>
            <Money amountVnd={summary.data.netSales} size="lg" color={colors.onIndigo} />
            <p className="mt-xs text-body-sm" style={{ color: alpha(colors.onIndigo, 0.72) }}>
              {summary.data.completedOrderCount} đơn hoàn thành
            </p>
          </Card>
          <div className="grid gap-sm md:grid-cols-3">
            <Card>
              <p className="text-body-sm text-muted">Doanh thu gộp</p>
              <Money amountVnd={summary.data.grossSales} size="lg" />
            </Card>
            <Card>
              <p className="text-body-sm text-muted">Đã hoàn tiền</p>
              <Money amountVnd={summary.data.refundedAmount} size="lg" />
            </Card>
            <Card>
              <p className="text-body-sm text-muted">Trung bình / đơn</p>
              <Money amountVnd={average} size="lg" />
            </Card>
          </div>
          {summary.data.buckets.length === 0 ? (
            <EmptyState icon="chart-line" title="Chưa có đơn hoàn tất trong khoảng này" />
          ) : (
            <Card padded={false}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-body-sm">
                  <thead className="border-b border-border bg-bg text-muted">
                    <tr>
                      <th className="p-sm">Khoảng thời gian</th>
                      <th className="p-sm text-right">Số đơn</th>
                      <th className="p-sm text-right">Doanh thu</th>
                      <th className="p-sm text-right">Hoàn tiền</th>
                      <th className="p-sm text-right">Thực thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.data.buckets.map((bucket) => (
                      <tr key={bucket.key} className="border-b border-border last:border-0">
                        <td className="p-sm text-text">{bucket.key}</td>
                        <td className="p-sm text-right">{bucket.completedOrderCount}</td>
                        <td className="p-sm text-right">{bucket.grossSales.toLocaleString('vi-VN')} đ</td>
                        <td className="p-sm text-right">{bucket.refundedAmount.toLocaleString('vi-VN')} đ</td>
                        <td className="p-sm text-right font-semibold">{bucket.netSales.toLocaleString('vi-VN')} đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}
