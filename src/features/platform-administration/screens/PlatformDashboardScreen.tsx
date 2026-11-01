import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { OVERVIEW_REFRESH_MS } from '@/core/config/refresh';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, IconButton } from '@/components/common';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FilterChips } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import type { RoleCode } from '@/core/types/role';
import { RoleMixBar } from '../components/AdminParts';
import { CountPanel, SplitBar, TaskList } from '../components/DashboardParts';
import { ExportPanel } from '../components/ExportPanel';
import {
  KpiCard,
  OrdersChart,
  TopStorefrontsTable,
} from '../components/DashboardMetrics';
import { PlatformConnection } from '../components/PlatformConnection';
import { formatDay } from '../components/admin-format';
import { platformApi, PlatformApiError, type PlatformDashboard } from '../platform-api';

type Preset = '7' | '30' | '90' | 'custom';

const ISO = 'YYYY-MM-DD';
const percent = (value: number) => `${value.toLocaleString('vi-VN')}%`;
const count = (value: number) => value.toLocaleString('vi-VN');
const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export function PlatformDashboardScreen() {
  return (
    <PlatformConnection>
      <DashboardContent />
    </PlatformConnection>
  );
}

/**
 * The platform from above, from the server's own counts: what is waiting for the admin, then the
 * period's figures against the one before, the orders day by day, and what the accounts,
 * storefronts and orders are made of. Ward revenue (rent, penalties) is not part of this screen.
 */
function DashboardContent() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>('30');
  const [exporting, setExporting] = useState(false);
  const [custom, setCustom] = useState({
    from: dayjs().subtract(29, 'day').format(ISO),
    to: dayjs().format(ISO),
  });

  const range =
    preset === 'custom'
      ? custom
      : { from: dayjs().subtract(Number(preset) - 1, 'day').format(ISO), to: dayjs().format(ISO) };
  const customInvalid =
    preset === 'custom' &&
    (!custom.from || !custom.to || custom.from > custom.to || dayjs(custom.to).diff(custom.from, 'day') >= 366);

  const dashboard = useQuery({
    queryKey: ['platform', 'dashboard', range],
    queryFn: () => platformApi.dashboard(range),
    enabled: !customInvalid,
    placeholderData: keepPreviousData,
    refetchInterval: OVERVIEW_REFRESH_MS,
  });
  const data = dashboard.data;

  return (
    <Screen width="wide">
      <AppHeader
        title="Tổng quan nền tảng"
        subtitle="Chợ vỉa hè StreetBiz · ADM-06"
        right={
          <>
            <Button
              label="Xuất báo cáo"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => setExporting(true)}
            />
            <IconButton
              icon="account-circle-outline"
              accessibilityLabel="Tài khoản"
              onPress={() => navigate('/account')}
            />
          </>
        }
      />

      <div className="flex flex-col gap-xs">
        <FilterChips
          value={preset}
          onChange={setPreset}
          options={[
            { value: '7', label: '7 ngày' },
            { value: '30', label: '30 ngày' },
            { value: '90', label: '90 ngày' },
            { value: 'custom', label: 'Tuỳ chọn' },
          ]}
        />
        {preset === 'custom' ? (
          <div className="flex flex-wrap items-center gap-sm text-body-sm text-text">
            <label className="flex items-center gap-xs">
              Từ ngày
              <input
                type="date"
                value={custom.from}
                max={custom.to || undefined}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className="h-10 rounded-[10px] border border-border bg-card px-sm"
              />
            </label>
            <label className="flex items-center gap-xs">
              Đến ngày
              <input
                type="date"
                value={custom.to}
                min={custom.from || undefined}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className="h-10 rounded-[10px] border border-border bg-card px-sm"
              />
            </label>
            {customInvalid ? (
              <span role="alert" className="text-error">
                Chọn khoảng thời gian hợp lệ, tối đa 366 ngày.
              </span>
            ) : null}
          </div>
        ) : null}
        {data ? (
          <p className="text-body-sm text-muted">
            {formatDay(data.from)} – {formatDay(data.to)}, so với {formatDay(data.previousFrom)} –{' '}
            {formatDay(data.previousTo)}
          </p>
        ) : null}
      </div>

      {dashboard.isPending && !customInvalid ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <ErrorState
          message={
            dashboard.error instanceof PlatformApiError
              ? dashboard.error.message
              : 'Không tải được số liệu nền tảng.'
          }
          onRetry={() => void dashboard.refetch()}
        />
      ) : data ? (
        <DashboardBody data={data} />
      ) : null}

      {exporting ? (
        <ExportPanel
          defaultFrom={customInvalid ? dayjs().subtract(29, 'day').format(ISO) : range.from}
          defaultTo={customInvalid ? dayjs().format(ISO) : range.to}
          onClose={() => setExporting(false)}
        />
      ) : null}
    </Screen>
  );
}

function DashboardBody({ data }: { data: PlatformDashboard }) {
  const navigate = useNavigate();
  const { users, marketplace, orders, moderation } = data;
  const storefronts =
    marketplace.storefrontsOpen + marketplace.storefrontsPaused + marketplace.storefrontsClosed;
  const roleCounts: Record<RoleCode, number> = {
    CUSTOMER: users.customers,
    VENDOR: users.vendors,
    WARD_AUTHORITY: users.wardAuthorities,
    PLATFORM_ADMIN: users.platformAdmins,
  };

  return (
    <>
      <TaskList
        tasks={[
          {
            key: 'moderation',
            icon: 'shield-alert-outline',
            title: 'Chờ kiểm duyệt',
            count: moderation.pendingReports,
            hint: moderation.pendingReports > 0 ? 'Nội dung bị báo cáo' : 'Không có báo cáo mới',
            onPress: () => navigate('/platform/moderation'),
          },
          {
            key: 'complaints',
            icon: 'chat-alert-outline',
            title: 'Khiếu nại đơn hàng đang mở',
            count: moderation.openComplaints,
            hint:
              moderation.pendingRefunds > 0
                ? `${moderation.pendingRefunds} khoản hoàn tiền chờ cổng thanh toán (${money(moderation.pendingRefundAmount)})`
                : 'Không có khoản hoàn tiền đang chờ',
            onPress: () => navigate('/platform/moderation'),
          },
          {
            key: 'suspended',
            icon: 'lock-outline',
            title: 'Tài khoản đang khoá',
            count: users.suspended,
            hint: users.suspended > 0 ? 'Xem và mở lại khi cần' : 'Không có tài khoản nào bị khoá',
            onPress: () => navigate('/platform/accounts'),
          },
          {
            key: 'categories',
            icon: 'shape-outline',
            title: 'Danh mục món ăn',
            hint: 'Nhóm món người mua dùng để lọc quán',
            onPress: () => navigate('/platform/categories'),
          },
        ]}
      />

      <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Đơn hàng" icon="receipt-text-outline" metric={orders.placed} format={count} />
        <KpiCard
          label="Giá trị đơn hoàn tất"
          icon="cash-multiple"
          metric={orders.gmv}
          format={money}
        />
        <KpiCard
          label="Tỷ lệ huỷ / từ chối"
          icon="cancel"
          metric={orders.cancelRejectRate}
          format={percent}
          goodWhen="down"
        />
        <KpiCard
          label="Người dùng mới"
          icon="account-plus-outline"
          metric={users.newUsers}
          format={count}
        />
        <KpiCard
          label="Báo cáo nội dung mới"
          icon="flag-outline"
          metric={moderation.reportsFiled}
          format={count}
          goodWhen="down"
        />
      </div>

      <div className="grid items-start gap-md xl:grid-cols-[minmax(0,1fr)_380px]">
        <OrdersChart days={data.ordersByDay} />
        <TopStorefrontsTable rows={data.topStorefronts} />
      </div>

      <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
        <CountPanel
          label="Tài khoản"
          value={users.total}
          icon="account-group-outline"
          onPress={() => navigate('/platform/accounts')}
          className="md:col-span-2 xl:col-span-1"
        >
          <RoleMixBar counts={roleCounts} suspended={users.suspended} compact />
        </CountPanel>

        <CountPanel label="Gian hàng" value={storefronts} icon="storefront-outline">
          <SplitBar
            parts={[
              { label: 'Đang mở', value: marketplace.storefrontsOpen, className: 'bg-tertiary' },
              { label: 'Tạm dừng', value: marketplace.storefrontsPaused, className: 'bg-accent' },
              { label: 'Đã đóng', value: marketplace.storefrontsClosed, className: 'bg-muted' },
            ]}
          />
          {marketplace.storefrontsHidden > 0 ? (
            <p className="text-body-sm text-muted">
              {marketplace.storefrontsHidden} gian hàng đang bị ẩn do vi phạm
            </p>
          ) : null}
        </CountPanel>

        <CountPanel label="Đơn theo trạng thái" value={orders.placed.value} icon="receipt-text-outline">
          {orders.byStatus.length === 0 ? (
            <p className="flex flex-1 items-center gap-sm rounded-[14px] bg-sunken/70 px-sm py-sm text-body-sm text-muted">
              <Icon name="receipt-text-outline" size={22} color="currentColor" weight="duotone" />
              Chưa có đơn hàng nào trong kỳ
            </p>
          ) : (
            <ul className="flex flex-wrap gap-xs">
              {orders.byStatus.map(({ status, count: n }) => (
                <li key={status} className="flex items-center gap-1.5">
                  <StatusChip code={status} />
                  <span className="font-sign text-body-md font-semibold text-text font-tabular">
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {moderation.averageReviewHours !== null ? (
            <p className="text-body-sm text-muted">
              Báo cáo nội dung xử lý trung bình {moderation.averageReviewHours.toLocaleString('vi-VN')} giờ
            </p>
          ) : null}
        </CountPanel>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Đang tải số liệu nền tảng" className="flex flex-col gap-md">
      <Skeleton className="h-[220px] w-full" />
      <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[132px] w-full" />
        ))}
      </div>
      <Skeleton className="h-[240px] w-full" />
    </div>
  );
}
