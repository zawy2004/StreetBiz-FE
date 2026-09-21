import { useNavigate } from 'react-router-dom';

import { Button, IconButton } from '@/components/common';
import { ResponsiveGrid, StatCard } from '@/components/data';
import { AppHeader, Screen } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function PlatformDashboardScreen() {
  const navigate = useNavigate();
  const users = useMockDb((s) => s.users);
  const vendors = useMockDb((s) => s.vendors);
  const storefronts = useMockDb((s) => s.storefronts);
  const orders = useMockDb((s) => s.orders);
  const reportedContent = useMockDb((s) => s.reportedContent);

  const openStores = storefronts.filter((s) => s.availability_status === 'OPEN').length;
  const pendingModeration = reportedContent.filter((r) => r.status === 'PENDING').length;

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
      <ResponsiveGrid minItemWidth={200} fit>
        <StatCard
          label="Tài khoản"
          value={`${users.length}`}
          icon="account-group-outline"
          onPress={() => navigate('/platform/accounts')}
        />
        <StatCard label="Hộ kinh doanh" value={`${vendors.length}`} icon="storefront-outline" tone="tertiary" />
        <StatCard
          label="Gian hàng đang mở"
          value={`${openStores}`}
          hint={`trên ${storefronts.length} gian hàng`}
          icon="silverware-fork-knife"
          tone="secondary"
        />
        <StatCard label="Đơn hàng" value={`${orders.length}`} icon="receipt-text-outline" />
        <StatCard
          label="Chờ kiểm duyệt"
          value={`${pendingModeration}`}
          hint={pendingModeration > 0 ? 'Nội dung bị báo cáo' : 'Không có báo cáo mới'}
          icon="shield-alert-outline"
          tone="primary"
          onPress={() => navigate('/platform/moderation')}
        />
      </ResponsiveGrid>
    </Screen>
  );
}
