import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button, formatVnd, Icon } from '@/components/common';
import { EmptyState, ErrorState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { orderApi } from '@/features/orders/api/orderApi';
import { orderKeys } from '@/features/orders/hooks/useOrders';
import type { SalesGroup } from '@/features/orders/types/order.types';
import { CountUp } from '@/features/food-safety/components/CountUp';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import {
  EmptyChart,
  SalesBarChart,
  SalesSkeleton,
  SalesStatTile,
} from '../components/sales/SalesParts';
import {
  activeDays,
  bestBucket,
  bucketLabel,
  dateInput,
  daysInRange,
  fillDailyBuckets,
  presetRange,
  refundRate,
  toUtc,
  type RangePreset,
} from '../sales-view';

const PRESETS: { kind: RangePreset; label: string }[] = [
  { kind: 'week', label: '7 ngày' },
  { kind: 'month30', label: '30 ngày' },
  { kind: 'thisMonth', label: 'Tháng này' },
  { kind: 'lastMonth', label: 'Tháng trước' },
];

const GROUP_WORD: Record<SalesGroup, string> = { day: 'ngày', week: 'tuần', month: 'tháng' };

const dateClass = (invalid: boolean) =>
  `input-shell h-12 w-full min-w-0 rounded-[12px] border bg-card px-sm text-body-lg text-text ${invalid ? 'border-error' : 'border-border'}`;

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
  const roomy = useMediaQuery('(min-width: 768px)');

  const average = summary.data?.completedOrderCount
    ? summary.data.netSales / summary.data.completedOrderCount
    : 0;
  const buckets = summary.data?.buckets;
  const columns = useMemo(
    () =>
      buckets && groupBy === 'day' ? fillDailyBuckets(buckets, fromDate, toDate) : (buckets ?? []),
    [buckets, groupBy, fromDate, toDate],
  );
  const best = useMemo(() => bestBucket(buckets ?? []), [buckets]);
  const peak = Math.max(1, ...(buckets ?? []).map((b) => b.netSales));
  const invalid = fromDate > toDate;
  // Quick ranges set both dates in one go: one new query, not two.
  const pick = (kind: RangePreset) => {
    const range = presetRange(kind, now);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };
  const activePreset = PRESETS.find((preset) => {
    const range = presetRange(preset.kind, now);
    return range.fromDate === fromDate && range.toDate === toDate;
  })?.kind;
  const chartHeight = roomy ? 200 : 140;

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
            icon={
              <Icon
                name="history"
                size={18}
                color="currentColor"
                className={
                  summary.isFetching && !summary.isPending
                    ? 'animate-spin [animation-direction:reverse]'
                    : ''
                }
              />
            }
            onPress={() => void summary.refetch()}
          />
        }
      />

      <div className="flex flex-col gap-sm rounded-[20px] bg-card p-sm shadow-card ring-1 ring-border md:p-md xl:flex-row xl:flex-wrap xl:items-end xl:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-xs overflow-x-auto px-1 py-0.5">
          {PRESETS.map((preset) => {
            const on = preset.kind === activePreset;
            return (
              <button
                key={preset.kind}
                type="button"
                aria-pressed={on}
                onClick={() => pick(preset.kind)}
                className={[
                  'inline-flex h-11 shrink-0 items-center rounded-full px-md text-label transition-[background-color,box-shadow] duration-150',
                  on
                    ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_18px_-10px_rgb(var(--c-primary)/0.8)]'
                    : 'bg-sunken text-text hover:bg-tint-primary',
                ].join(' ')}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-sm md:flex-row md:items-end">
          <div className="grid grid-cols-2 gap-sm md:w-[340px]">
            <label className="flex min-w-0 flex-col gap-2xs text-label text-text">
              Từ ngày
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(event) => setFromDate(event.target.value)}
                aria-invalid={invalid || undefined}
                className={dateClass(invalid)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2xs text-label text-text">
              Đến ngày
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(event) => setToDate(event.target.value)}
                aria-invalid={invalid || undefined}
                className={dateClass(invalid)}
              />
            </label>
          </div>
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
      </div>

      {invalid ? (
        <p
          role="alert"
          className="flex items-center gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-lg text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon name="alert-circle-outline" size={20} color="currentColor" className="shrink-0" />
          Từ ngày không được sau đến ngày.
        </p>
      ) : summary.isPending ? (
        <SalesSkeleton />
      ) : summary.isError ? (
        <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />
      ) : summary.data ? (
        <>
          <section
            aria-labelledby="sales-net-label"
            className="overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border"
          >
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            <div className="flex flex-col gap-md p-md md:p-lg">
              <div className="flex flex-wrap items-start justify-between gap-sm">
                <div className="flex min-w-0 flex-col gap-1">
                  <p id="sales-net-label" className="text-body-lg text-muted">
                    Doanh thu thuần
                  </p>
                  <p
                    className={`font-sign font-bold leading-none tracking-[-0.02em] tabular-nums text-text [font-stretch:92%] md:text-[56px] xl:text-[72px] ${summary.data.netSales.toLocaleString('vi-VN').length > 9 ? 'text-[36px]' : 'text-[44px]'}`}
                  >
                    <CountUp
                      value={summary.data.netSales}
                      format={(n) => n.toLocaleString('vi-VN')}
                    />
                    <span className="ml-1 text-[0.5em] text-primary">đ</span>
                  </p>
                  <p className="text-body-md text-text/75">
                    {summary.data.completedOrderCount} đơn hoàn thành
                    {groupBy === 'day' && !invalid
                      ? ` · ${activeDays(summary.data.buckets)}/${daysInRange(fromDate, toDate)} ngày có đơn`
                      : ''}
                  </p>
                </div>
                {best ? (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E8] px-sm py-1 text-body-md text-text dark:bg-brand/15">
                    <Icon name="star" size={16} color="currentColor" className="text-brand" />
                    Cao nhất: {bucketLabel(best.key)} ·{' '}
                    <span className="font-sign font-bold tabular-nums">
                      {formatVnd(best.netSales)}
                    </span>
                  </p>
                ) : null}
              </div>
              {summary.data.buckets.length ? (
                <>
                  <SalesBarChart
                    buckets={columns}
                    groupBy={groupBy}
                    best={best}
                    height={chartHeight}
                    describedBy="sales-breakdown-title"
                  />
                  {groupBy !== 'day' && summary.data.buckets.length <= 2 ? (
                    <p className="text-body-sm text-muted">
                      Chỉ có {summary.data.buckets.length} {GROUP_WORD[groupBy]} có đơn trong khoảng
                      này
                    </p>
                  ) : null}
                </>
              ) : (
                <EmptyChart height={chartHeight} />
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
            <SalesStatTile
              label="Doanh thu gộp"
              value={formatVnd(summary.data.grossSales)}
              rule="bg-primary"
            />
            <SalesStatTile
              label="Đã hoàn tiền"
              labelClass="text-[#8F1717] dark:text-[#FF9A90]"
              value={formatVnd(summary.data.refundedAmount)}
              rule="bg-[#F4A49C]"
              note={
                refundRate(summary.data) !== null ? (
                  <p className="text-body-sm text-[#8F1717] dark:text-[#FF9A90]">
                    {refundRate(summary.data)!.toLocaleString('vi-VN', {
                      maximumFractionDigits: 1,
                    })}
                    % doanh thu gộp
                  </p>
                ) : null
              }
            />
            <SalesStatTile
              label="Trung bình / đơn"
              value={formatVnd(average)}
              rule="bg-secondary"
              className="col-span-2 md:col-span-1"
            />
          </div>

          {summary.data.buckets.length === 0 ? (
            <div className="rounded-[24px] bg-card ring-1 ring-border">
              <EmptyState
                icon="chart-line"
                title="Chưa có đơn hoàn tất trong khoảng này"
                description="Thử chọn 30 ngày hoặc tháng trước."
                action={
                  <div className="flex flex-wrap justify-center gap-xs">
                    <Button
                      label="Chọn 30 ngày"
                      variant="outline"
                      fullWidth={false}
                      onPress={() => pick('month30')}
                    />
                    <Button
                      label="Chọn tháng trước"
                      variant="outline"
                      fullWidth={false}
                      onPress={() => pick('lastMonth')}
                    />
                  </div>
                }
              />
            </div>
          ) : (
            <section aria-labelledby="sales-breakdown-title" className="flex flex-col gap-sm">
              <h2
                id="sales-breakdown-title"
                className="font-heading text-[19px] font-bold text-text"
              >
                Chi tiết theo {GROUP_WORD[groupBy]}
              </h2>
              <div className="hidden overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border md:block">
                <table className="w-full text-left text-[15px]">
                  <thead className="border-b border-border bg-sunken/60 text-body-sm text-muted">
                    <tr>
                      <th className="p-sm pl-md font-semibold">Khoảng thời gian</th>
                      <th className="p-sm text-right font-semibold">Số đơn</th>
                      <th className="p-sm text-right font-semibold">Doanh thu</th>
                      <th className="p-sm text-right font-semibold">Hoàn tiền</th>
                      <th className="w-[34%] p-sm pr-md text-right font-semibold">Thực thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.data.buckets.map((bucket) => (
                      <tr
                        key={bucket.key}
                        className={`border-b border-border last:border-0 ${best?.key === bucket.key ? 'bg-[#FFF3E8] dark:bg-brand/10' : ''}`}
                      >
                        <td className="p-sm pl-md text-text">{bucketLabel(bucket.key)}</td>
                        <td className="p-sm text-right tabular-nums">
                          {bucket.completedOrderCount}
                        </td>
                        <td className="p-sm text-right tabular-nums">
                          {formatVnd(bucket.grossSales)}
                        </td>
                        <td className="p-sm text-right tabular-nums">
                          {formatVnd(bucket.refundedAmount)}
                        </td>
                        <td className="p-sm pr-md">
                          <div className="flex items-center justify-end gap-sm">
                            <span
                              aria-hidden="true"
                              className="h-1.5 max-w-[140px] flex-1 overflow-hidden rounded-full bg-sunken"
                            >
                              <span
                                className="block h-full rounded-full bg-primary/40"
                                style={{ width: `${Math.max(0, (bucket.netSales / peak) * 100)}%` }}
                              />
                            </span>
                            <span className="font-sign font-bold tabular-nums text-text">
                              {formatVnd(bucket.netSales)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="flex flex-col divide-y divide-border rounded-[20px] bg-card shadow-card ring-1 ring-border md:hidden">
                {summary.data.buckets.map((bucket) => (
                  <li
                    key={bucket.key}
                    className={`flex flex-col gap-0.5 px-md py-sm ${best?.key === bucket.key ? 'bg-[#FFF3E8] dark:bg-brand/10' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-sm">
                      <span className="text-body-lg font-medium text-text">
                        {bucketLabel(bucket.key)}
                      </span>
                      <span className="font-sign text-[18px] font-bold tabular-nums text-text">
                        {formatVnd(bucket.netSales)}
                      </span>
                    </div>
                    <span className="text-body-sm text-muted">
                      {bucket.completedOrderCount} đơn · doanh thu {formatVnd(bucket.grossSales)} ·
                      hoàn {formatVnd(bucket.refundedAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}
    </Screen>
  );
}
