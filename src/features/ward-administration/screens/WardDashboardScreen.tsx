import { useNavigate } from 'react-router-dom';

import { Card, formatVnd, Icon, IconButton, type IconName } from '@/components/common';
import { ResponsiveGrid, StatCard } from '@/components/data';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { LoadingState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { WARD } from '@/mocks/seed';
import { colors } from '@/theme';
import { useWardDashboard } from '../useWardReports';

type Shortcut = { to: string; icon: IconName; title: string; description: string };

const SHORTCUTS: Shortcut[] = [
  {
    to: '/ward/inbox',
    icon: 'inbox-outline',
    title: 'Hộp duyệt',
    description: 'Hồ sơ đăng ký, đề xuất ô, xung đột địa chỉ và chuyển nhượng',
  },
  { to: '/ward/slots', icon: 'map-marker-radius-outline', title: 'Lưới ô vỉa hè', description: 'Theo dõi trạng thái từng ô' },
  {
    to: '/ward/patrol',
    icon: 'qrcode-scan',
    title: 'Tuần tra và quét QR',
    description: 'Kiểm tra giấy phép số, phân tích ảnh hiện trường',
  },
  {
    to: '/ward/patrol/violations/new',
    icon: 'gavel',
    title: 'Lập biên bản vi phạm',
    description: 'Biên bản hiện trường và quyết định xử phạt (NĐ 168/2024)',
  },
];

export function WardDashboardScreen() {
  const navigate = useNavigate();
  const { dashboard, isLoading } = useWardDashboard();
  const pendingCount = dashboard
    ? dashboard.pendingRegistrations + dashboard.pendingApplications
    : 0;

  return (
    <Screen width="wide">
      <AppHeader
        title="Tổng quan"
        subtitle={WARD.unit_type}
        right={
          <>
            <IconButton
              icon="cog-outline"
              accessibilityLabel="Cấu hình"
              onPress={() => navigate('/ward/settings/pricing')}
            />
            <IconButton
              icon="account-circle-outline"
              accessibilityLabel="Tài khoản"
              onPress={() => navigate('/account')}
            />
          </>
        }
      />

      {isLoading || !dashboard ? (
        <LoadingState />
      ) : (
        <>
          <ResponsiveGrid minItemWidth={210} fit>
            <StatCard
              label="Ô đang thuê"
              value={`${dashboard.slotRented}/${dashboard.slotTotal}`}
              hint="ô trên toàn phường"
              icon="map-marker-radius-outline"
              tone="indigo"
              onPress={() => navigate('/ward/slots')}
            />
            <StatCard
              label="Tỷ lệ lấp đầy"
              value={`${dashboard.occupancyPercent}%`}
              icon="chart-bar"
              tone="tertiary"
            />
            <StatCard
              label="Hồ sơ chờ duyệt"
              value={`${pendingCount}`}
              hint={pendingCount > 0 ? 'Mở hộp duyệt để xử lý' : 'Đã xử lý hết'}
              icon="inbox-outline"
              tone="primary"
              onPress={() => navigate('/ward/inbox')}
            />
            <StatCard
              label="Đã thu"
              value={formatVnd(dashboard.revenueCollected)}
              hint="phí thuê ô và tiền phạt"
              icon="cash-multiple"
              tone="secondary"
              onPress={() => navigate('/ward/reports')}
            />
            <StatCard
              label="Còn phải thu"
              value={formatVnd(dashboard.outstandingDebt)}
              hint="phí và phạt chưa thanh toán"
              icon="clock-outline"
              tone="primary"
              onPress={() => navigate('/ward/reports')}
            />
            <StatCard
              label="Vi phạm cần xử lý"
              value={`${dashboard.openViolations}`}
              hint={dashboard.openViolations > 0 ? 'chưa xử phạt hoặc chưa nộp phạt' : 'Đã xử lý hết'}
              icon="shield-alert-outline"
              tone="indigo"
            />
          </ResponsiveGrid>

          {env.enableAiCompliance ? (
            <AiHint title="Tóm tắt tuần này">
              {pendingCount} hồ sơ đang chờ xử lý, tỷ lệ lấp đầy {dashboard.occupancyPercent}%. Ưu
              tiên xét các hồ sơ cửa hàng cố định có giấy phép kinh doanh hợp lệ trước.
            </AiHint>
          ) : null}
        </>
      )}

      <Section title="Lối tắt">
        <ResponsiveGrid minItemWidth={240} gap="sm">
          {SHORTCUTS.map((s) => (
            <Card key={s.to} onPress={() => navigate(s.to)}>
              <div className="flex items-start gap-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-tint-indigo">
                  <Icon name={s.icon} size={22} color={colors.indigo} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-headline-sm text-text">{s.title}</h3>
                  <p className="mt-0.5 text-body-sm text-muted">{s.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </ResponsiveGrid>
      </Section>
    </Screen>
  );
}
