import { useNavigate } from 'react-router-dom';

import { Card, IconButton } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { WARD } from '@/mocks/seed';

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

  const stats = [
    { label: 'Ô đang thuê', value: `${rented}/${slots.length}` },
    { label: 'Tỷ lệ lấp đầy', value: `${occupancy}%` },
    { label: 'Hồ sơ chờ duyệt', value: `${pendingCount}` },
    { label: 'Doanh thu đã thu', value: `${(revenue / 1000).toLocaleString('vi-VN')}k đ` },
  ];

  return (
    <Screen>
      <AppHeader
        title="Tổng quan"
        subtitle={WARD.unit_type}
        right={
          <div className="flex flex-row gap-xs">
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
          </div>
        }
      />

      <div className="flex flex-row flex-wrap gap-sm">
        {stats.map((s) => (
          <Card key={s.label} style={{ flexGrow: 1, minWidth: 140 }}>
            <span className="block text-body-sm text-muted">{s.label}</span>
            <span className="mt-0.5 block text-headline-lg text-text">{s.value}</span>
          </Card>
        ))}
      </div>

      {env.enableAiCompliance ? (
        <AiHint title="Tóm tắt tuần này">
          {pendingCount} hồ sơ đang chờ xử lý, tỷ lệ lấp đầy {occupancy}%. Ưu tiên xét các hồ sơ cửa
          hàng cố định có giấy phép kinh doanh hợp lệ trước.
        </AiHint>
      ) : null}

      <Section title="Lối tắt">
        <Card onPress={() => navigate('/ward/inbox/reviews')}>
          <h3 className="text-headline-sm text-text">Duyệt hồ sơ vị trí · Backend</h3>
          <p className="text-body-sm text-muted">
            Đề xuất ô, xung đột địa chỉ và chuyển nhượng theo dữ liệu thật
          </p>
        </Card>
        <Card onPress={() => navigate('/ward/inbox')}>
          <h3 className="text-headline-sm text-text">Hộp duyệt</h3>
          <p className="text-body-sm text-muted">{pendingCount} việc cần xử lý</p>
        </Card>
        <Card onPress={() => navigate('/ward/slots')}>
          <h3 className="text-headline-sm text-text">Lưới ô vỉa hè</h3>
          <p className="text-body-sm text-muted">Theo dõi trạng thái từng ô</p>
        </Card>
        <Card onPress={() => navigate('/ward/patrol')}>
          <h3 className="text-headline-sm text-text">Tuần tra hiện trường</h3>
          <p className="text-body-sm text-muted">Quét QR &amp; lập biên bản</p>
        </Card>
      </Section>
    </Screen>
  );
}
