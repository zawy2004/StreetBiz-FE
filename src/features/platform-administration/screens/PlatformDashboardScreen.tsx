import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, IconButton } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import { isLiveApi } from '@/core/config/env';
import type { RoleCode } from '@/core/types/role';
import { useMockDb } from '@/mocks/db';
import { InfoBand, RoleMixBar } from '../components/AdminParts';
import { firstTimeThisSession } from '../components/admin-motion';
import { CountPanel, SplitBar, StorefrontStrip, TaskList } from '../components/DashboardParts';

/**
 * The platform from above: the strip of storefronts (lit when open) first,
 * then what is waiting for the admin, then what the accounts, vendors and
 * orders are made of. Every figure comes from the in-browser store, as before.
 */
export function PlatformDashboardScreen() {
  const navigate = useNavigate();
  const users = useMockDb((s) => s.users);
  const vendors = useMockDb((s) => s.vendors);
  const storefronts = useMockDb((s) => s.storefronts);
  const orders = useMockDb((s) => s.orders);
  const reportedContent = useMockDb((s) => s.reportedContent);

  const openStores = storefronts.filter((s) => s.availability_status === 'OPEN').length;
  const pendingModeration = reportedContent.filter((r) => r.status === 'PENDING').length;

  // Display only: break the same arrays down further.
  const [play] = useState(() => firstTimeThisSession('platform-dashboard'));
  const roleCounts = (
    ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'] as RoleCode[]
  ).reduce(
    (acc, role) => ({ ...acc, [role]: users.filter((u) => u.role_code === role).length }),
    {} as Record<RoleCode, number>,
  );
  const suspended = users.filter((u) => u.account_status === 'SUSPENDED').length;
  const fixedVendors = vendors.filter((v) => v.vendor_type === 'FIXED_STOREFRONT').length;
  const itinerantVendors = vendors.filter((v) => v.vendor_type === 'ITINERANT').length;
  const orderStatuses = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.order_status] = (acc[o.order_status] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <Screen width="wide">
      <AppHeader
        title="Tổng quan nền tảng"
        subtitle="Chợ vỉa hè StreetBiz"
        right={
          <>
            <Button
              label="Xuất báo cáo"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => showToast('Đã xuất báo cáo (demo)')}
            />
            <IconButton
              icon="account-circle-outline"
              accessibilityLabel="Tài khoản"
              onPress={() => navigate('/account')}
            />
          </>
        }
      />

      {isLiveApi ? <InfoBand>Số liệu mẫu trong trình duyệt, chưa nối máy chủ</InfoBand> : null}

      <StorefrontStrip storefronts={storefronts} openCount={openStores} play={play} />

      <TaskList
        tasks={[
          {
            key: 'moderation',
            icon: 'shield-alert-outline',
            title: 'Chờ kiểm duyệt',
            count: pendingModeration,
            hint: pendingModeration > 0 ? 'Nội dung bị báo cáo' : 'Không có báo cáo mới',
            onPress: () => navigate('/platform/moderation'),
          },
          {
            key: 'suspended',
            icon: 'lock-outline',
            title: 'Tài khoản đang khoá',
            count: suspended,
            hint: suspended > 0 ? 'Xem và mở lại khi cần' : 'Không có tài khoản nào bị khoá',
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

      <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
        <CountPanel
          label="Tài khoản"
          value={users.length}
          icon="account-group-outline"
          onPress={() => navigate('/platform/accounts')}
          className="md:col-span-2 xl:col-span-1"
        >
          <RoleMixBar counts={roleCounts} suspended={suspended} compact />
        </CountPanel>

        <CountPanel label="Hộ kinh doanh" value={vendors.length} icon="storefront-outline">
          <SplitBar
            parts={[
              { label: 'Cố định', value: fixedVendors, className: 'bg-tertiary' },
              { label: 'Lưu động', value: itinerantVendors, className: 'bg-accent' },
            ]}
          />
        </CountPanel>

        <CountPanel label="Đơn hàng" value={orders.length} icon="receipt-text-outline">
          {orderStatuses.length === 0 ? (
            <p className="flex flex-1 items-center gap-sm rounded-[14px] bg-sunken/70 px-sm py-sm text-body-sm text-muted">
              <Icon name="receipt-text-outline" size={22} color="currentColor" weight="duotone" />
              Chưa có đơn hàng nào
            </p>
          ) : (
            <ul className="flex flex-wrap gap-xs">
              {orderStatuses.map(([status, count]) => (
                <li key={status} className="flex items-center gap-1.5">
                  <StatusChip code={status} />
                  <span className="font-sign text-body-md font-semibold text-text font-tabular">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CountPanel>
      </div>
    </Screen>
  );
}
