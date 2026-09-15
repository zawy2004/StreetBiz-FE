import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function TransfersListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const transfers = useMockDb((s) => s.transfers);
  const slots = useMockDb((s) => s.slots);
  const contracts = useMockDb((s) => s.contracts);

  const outgoing = transfers.filter((t) => t.fromVendorId === user?.vendorId);
  const incoming = transfers.filter(
    (t) =>
      t.toVendorPhone.replace(/\D/g, '') === user?.phone.replace(/\D/g, '') &&
      t.transfer_status === 'PENDING',
  );

  const slotLabel = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    return slots.find((s) => s.id === contract?.slotId)?.slot_code ?? contractId;
  };

  return (
    <Screen>
      <AppHeader title="Chuyển nhượng ô" back />

      <Section title="Yêu cầu gửi đến bạn">
        {incoming.length === 0 ? (
          <EmptyState icon="swap-horizontal" title="Không có yêu cầu nào" />
        ) : (
          incoming.map((t) => (
            <Card key={t.id} onPress={() => router.push(`/vendor/slots/transfers/${t.id}/accept`)}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>
                {slotLabel(t.contractId)}
              </Text>
              <Text style={[typography.bodySm, { color: colors.muted }]}>
                Nhấn để xem &amp; chấp nhận
              </Text>
            </Card>
          ))
        )}
      </Section>

      <Section title="Yêu cầu đã gửi">
        {outgoing.length === 0 ? (
          <EmptyState icon="swap-horizontal" title="Chưa gửi yêu cầu nào" />
        ) : (
          outgoing.map((t) => (
            <Card key={t.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 4 }}>
                  <Text style={[typography.headlineSm, { color: colors.text }]}>
                    {slotLabel(t.contractId)}
                  </Text>
                  <Text style={[typography.bodySm, { color: colors.muted }]}>
                    Tới {t.toVendorPhone}
                  </Text>
                </View>
                <StatusChip code={t.transfer_status} />
              </View>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
