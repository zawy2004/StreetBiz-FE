import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button, Card, ListRow } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function VendorHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const registrations = useMockDb((s) => s.registrations).filter(
    (r) => r.vendorId === user?.vendorId,
  );
  const contracts = useMockDb((s) => s.contracts).filter(
    (c) => c.vendorId === user?.vendorId && c.contract_status === 'ACTIVE',
  );
  const feeItems = useMockDb((s) => s.feeItems).filter(
    (f) => f.vendorId === user?.vendorId && f.item_status === 'PENDING',
  );
  const penalties = useMockDb((s) => s.penalties).filter(
    (p) => p.vendorId === user?.vendorId && p.penalty_status === 'PENDING',
  );
  const permits = useMockDb((s) => s.permits).filter((p) =>
    contracts.some((c) => c.id === p.contractId),
  );

  const todos = [
    ...registrations
      .filter((r) => r.registration_status === 'NEEDS_INFO')
      .map((r) => ({
        key: r.id,
        title: `Bổ sung hồ sơ: ${r.business_name}`,
        onPress: () => router.push(`/vendor/registrations/${r.id}` as never),
      })),
    ...feeItems.map((f) => ({
      key: f.id,
      title: `Thanh toán phí ${f.period_label}`,
      onPress: () => router.push(`/vendor/finance/fees/${f.id}/payment` as never),
    })),
    ...penalties.map((p) => ({
      key: p.id,
      title: `Thanh toán biên bản phạt`,
      onPress: () => router.push(`/vendor/finance/penalties/${p.id}/payment` as never),
    })),
  ];

  const permit = permits[0];

  return (
    <Screen>
      <AppHeader title={`Chào ${user?.fullName ?? ''}`} subtitle="Hộ kinh doanh" />

      {permit ? (
        <Card
          onPress={() =>
            router.push(`/vendor/slots/contracts/${permit.contractId}/permit` as never)
          }
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MaterialCommunityIcons name="qrcode" size={28} color={colors.tertiary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>Giấy phép số</Text>
              <Text style={[typography.bodyMd, { color: colors.muted }]}>{permit.permit_code}</Text>
            </View>
            <StatusChip code={permit.permit_status} />
          </View>
        </Card>
      ) : null}

      <Section title="Việc cần làm">
        {todos.length === 0 ? (
          <EmptyState icon="check-circle-outline" title="Không có việc cần xử lý" />
        ) : (
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.md }}>
              {todos.map((t) => (
                <ListRow key={t.key} title={t.title} showChevron onPress={t.onPress} />
              ))}
            </View>
          </Card>
        )}
      </Section>

      <Section title="Lối tắt">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <View style={{ flexGrow: 1, minWidth: 150 }}>
            <Button
              label="Đăng ký kinh doanh"
              variant="outline"
              onPress={() => router.push('/vendor/registrations')}
            />
          </View>
          <View style={{ flexGrow: 1, minWidth: 150 }}>
            <Button
              label="Thuê ô vỉa hè"
              variant="outline"
              onPress={() => router.push('/vendor/slots')}
            />
          </View>
        </View>
      </Section>

      {registrations.length === 0 ? (
        <EmptyState
          icon="file-document-outline"
          title="Chưa có hồ sơ đăng ký"
          description="Đăng ký kinh doanh để bắt đầu thuê ô vỉa hè hợp pháp."
          action={
            <Button
              label="Đăng ký ngay"
              onPress={() => router.push('/vendor/registrations/new/type')}
            />
          }
        />
      ) : null}
    </Screen>
  );
}
