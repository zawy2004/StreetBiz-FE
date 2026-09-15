import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, IconButton } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { WARD } from '@/mocks/seed';

export function WardDashboardScreen() {
  const router = useRouter();
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
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <IconButton
              icon="cog-outline"
              accessibilityLabel="Cấu hình"
              onPress={() => router.push('/ward/settings/pricing')}
            />
            <IconButton
              icon="account-circle-outline"
              accessibilityLabel="Tài khoản"
              onPress={() => router.push('/account')}
            />
          </View>
        }
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ flexGrow: 1, minWidth: 140 }}>
            <Text style={[typography.bodySm, { color: colors.muted }]}>{s.label}</Text>
            <Text style={[typography.headlineLg, { color: colors.text, marginTop: 2 }]}>
              {s.value}
            </Text>
          </Card>
        ))}
      </View>

      {env.enableAiCompliance ? (
        <AiHint title="Tóm tắt tuần này">
          {pendingCount} hồ sơ đang chờ xử lý, tỷ lệ lấp đầy {occupancy}%. Ưu tiên xét các hồ sơ cửa
          hàng cố định có giấy phép kinh doanh hợp lệ trước.
        </AiHint>
      ) : null}

      <Section title="Lối tắt">
        <Card onPress={() => router.push('/ward/inbox')}>
          <Text style={[typography.headlineSm, { color: colors.text }]}>Hộp duyệt</Text>
          <Text style={[typography.bodySm, { color: colors.muted }]}>
            {pendingCount} việc cần xử lý
          </Text>
        </Card>
        <Card onPress={() => router.push('/ward/slots')}>
          <Text style={[typography.headlineSm, { color: colors.text }]}>Lưới ô vỉa hè</Text>
          <Text style={[typography.bodySm, { color: colors.muted }]}>
            Theo dõi trạng thái từng ô
          </Text>
        </Card>
        <Card onPress={() => router.push('/ward/patrol')}>
          <Text style={[typography.headlineSm, { color: colors.text }]}>Tuần tra hiện trường</Text>
          <Text style={[typography.bodySm, { color: colors.muted }]}>
            Quét QR &amp; lập biên bản
          </Text>
        </Card>
      </Section>
    </Screen>
  );
}
