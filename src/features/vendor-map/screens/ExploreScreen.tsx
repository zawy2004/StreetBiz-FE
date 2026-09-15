import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Avatar, Card, IconButton } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { WARD } from '@/mocks/seed';

export function ExploreScreen() {
  const router = useRouter();
  const vendors = useMockDb((s) => s.vendors);
  const contracts = useMockDb((s) => s.contracts).filter((c) => c.contract_status === 'ACTIVE');
  const permits = useMockDb((s) => s.permits);
  const slots = useMockDb((s) => s.slots);

  const activeVendors = contracts
    .map((c) => {
      const vendor = vendors.find((v) => v.id === c.vendorId);
      const permit = permits.find((p) => p.contractId === c.id);
      const slot = slots.find((s) => s.id === c.slotId);
      if (!vendor || !permit || !slot) return null;
      return { vendor, permit, slot };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <Screen>
      <AppHeader
        title="Khám phá"
        subtitle={WARD.unit_type}
        right={
          env.enablePhase2 ? (
            <IconButton
              icon="magnify"
              accessibilityLabel="Tìm kiếm"
              onPress={() => router.push('/customer/explore/search')}
            />
          ) : undefined
        }
      />
      {activeVendors.length === 0 ? (
        <EmptyState icon="storefront-outline" title="Chưa có hộ kinh doanh nào đang hoạt động" />
      ) : (
        activeVendors.map(({ vendor, permit, slot }) => (
          <Card
            key={vendor.id}
            onPress={() => router.push(`/customer/explore/vendors/${vendor.id}`)}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Avatar name={vendor.business_name} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.headlineSm, { color: colors.text }]}>
                  {vendor.business_name}
                </Text>
                <Text style={[typography.bodySm, { color: colors.muted }]}>
                  {slot.street} · Ô {slot.slot_code}
                </Text>
              </View>
              <StatusChip code={permit.permit_status} />
            </View>
          </Card>
        ))
      )}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.tertiary} />
        <Text style={[typography.bodySm, { color: colors.muted }]}>
          Chỉ hiển thị hộ kinh doanh có giấy phép hợp lệ
        </Text>
      </View>
    </Screen>
  );
}
