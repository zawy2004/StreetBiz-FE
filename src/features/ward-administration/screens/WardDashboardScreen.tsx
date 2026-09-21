import { useNavigate } from 'react-router-dom';

import { Card, Icon, IconButton, type IconName } from '@/components/common';
import { ResponsiveGrid, StatCard } from '@/components/data';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { WARD } from '@/mocks/seed';
import { colors } from '@/theme';

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
  const slots = useMockDb((s) => s.slots);
  const registrations = useMockDb((s) => s.registrations);
  const applications = useMockDb((s) => s.applications);
  const feeItems = useMockDb((s) => s.feeItems);
  const penalties = useMockDb((s) => s.penalties);

  const rented = slots.filter((s) => s.slot_status === 'RENTED').length;
  const occupancy = slots.length ? Math.round((rented / slots.length) * 100) : 0;
  const pendingCount =
    registrations.filter((r) => r.registration_status === 'UNDER_REVIEW').length +
    applications.filter((a) => a.application_status === 'PENDING').length;
  const revenue =
    feeItems.filter((f) => f.item_status === 'PAID').reduce((s, f) => s + f.amount, 0) +
    penalties.filter((p) => p.penalty_status === 'PAID').reduce((s, p) => s + p.amount, 0);

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

      <ResponsiveGrid minItemWidth={210} fit>
        <StatCard
          label="Ô đang thuê"
          value={`${rented}/${slots.length}`}
          hint="ô trên toàn phường"
          icon="map-marker-radius-outline"
          tone="indigo"
          onPress={() => navigate('/ward/slots')}
        />
        <StatCard label="Tỷ lệ lấp đầy" value={`${occupancy}%`} icon="chart-bar" tone="tertiary" />
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
          value={`${(revenue / 1000).toLocaleString('vi-VN')}k đ`}
          hint="phí thuê ô và tiền phạt"
          icon="cash-multiple"
          tone="secondary"
        />
      </ResponsiveGrid>

      {env.enableAiCompliance ? (
        <AiHint title="Tóm tắt tuần này">
          {pendingCount} hồ sơ đang chờ xử lý, tỷ lệ lấp đầy {occupancy}%. Ưu tiên xét các hồ sơ cửa
          hàng cố định có giấy phép kinh doanh hợp lệ trước.
        </AiHint>
      ) : null}

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
