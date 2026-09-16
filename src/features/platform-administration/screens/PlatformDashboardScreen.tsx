import { useNavigate } from 'react-router-dom';

import { Button, Card, IconButton } from '@/components/common';
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

  const stats = [
    { label: 'Tổng tài khoản', value: `${users.length}` },
    { label: 'Hộ kinh doanh', value: `${vendors.length}` },
    {
      label: 'Gian hàng đang mở',
      value: `${storefronts.filter((s) => s.availability_status === 'OPEN').length}`,
    },
    { label: 'Đơn hàng', value: `${orders.length}` },
    {
      label: 'Nội dung cần kiểm duyệt',
      value: `${reportedContent.filter((r) => r.status === 'PENDING').length}`,
    },
  ];

  return (
    <Screen>
      <AppHeader
        title="Tổng quan nền tảng"
        subtitle="Marketplace StreetBiz"
        right={
          <IconButton
            icon="account-circle-outline"
            accessibilityLabel="Tài khoản"
            onPress={() => navigate('/account')}
          />
        }
      />
      <div className="flex flex-wrap gap-sm">
        {stats.map((s) => (
          <Card key={s.label} style={{ flexGrow: 1, minWidth: 150 }}>
            <span className="block text-body-sm text-muted">{s.label}</span>
            <span className="mt-2xs block text-headline-lg text-text">{s.value}</span>
          </Card>
        ))}
      </div>
      <Button
        label="Xuất báo cáo vận hành"
        variant="outline"
        onPress={() => showToast('Đã xuất báo cáo (demo)')}
      />
    </Screen>
  );
}
