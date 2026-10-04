import { useNavigate } from 'react-router-dom';

import { Button, Card, IconButton } from '@/components/common';
import { RatioMeter, WorkQueue } from '@/components/data';
import { AppHeader, Screen, Section } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

/**
 * The administrator's desk: the moderation queue and suspended accounts first,
 * as a worklist, then the size and health of the marketplace.
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
  const suspended = users.filter((u) => u.account_status === 'SUSPENDED').length;

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

      <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Section
          title="Cần xử lý"
          description={
            pendingModeration > 0 ? 'Có nội dung đang chờ kiểm duyệt' : 'Không có việc tồn đọng'
          }
        >
          <WorkQueue
            primaryKey={pendingModeration > 0 ? 'moderation' : undefined}
            items={[
              {
                key: 'moderation',
                icon: 'shield-alert-outline',
                tone: pendingModeration > 0 ? 'pending' : 'neutral',
                label: 'Chờ kiểm duyệt',
                value: `${pendingModeration}`,
                hint: pendingModeration > 0 ? 'nội dung bị báo cáo' : 'Không có báo cáo mới',
                action: { label: 'Mở kiểm duyệt', onPress: () => navigate('/platform/moderation') },
              },
              {
                key: 'accounts',
                icon: 'account-group-outline',
                tone: suspended > 0 ? 'danger' : 'neutral',
                label: 'Tài khoản đang bị khoá',
                value: `${suspended}`,
                hint: `trên ${users.length} tài khoản`,
                action: {
                  label: 'Quản lý tài khoản',
                  onPress: () => navigate('/platform/accounts'),
                },
              },
            ]}
          />
        </Section>

        <Section title="Chợ vỉa hè">
          <Card>
            <RatioMeter
              label="Gian hàng đang mở"
              part={openStores}
              whole={storefronts.length}
              unit="gian hàng"
            />
            <dl className="mt-md grid grid-cols-2 gap-md border-t border-border pt-md">
              <div>
                <dt className="text-body-sm text-muted">Hộ kinh doanh</dt>
                <dd className="mt-2xs font-tabular text-headline-md text-text">{vendors.length}</dd>
              </div>
              <div>
                <dt className="text-body-sm text-muted">Đơn hàng</dt>
                <dd className="mt-2xs font-tabular text-headline-md text-text">{orders.length}</dd>
              </div>
            </dl>
          </Card>
        </Section>
      </div>
    </Screen>
  );
}
