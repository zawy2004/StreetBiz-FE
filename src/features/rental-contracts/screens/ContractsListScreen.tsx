import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function ContractsListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const contracts = useMockDb((s) => s.contracts).filter((c) => c.vendorId === user?.vendorId);
  const slots = useMockDb((s) => s.slots);

  return (
    <Screen>
      <AppHeader title="Hợp đồng thuê ô" back />
      {contracts.length === 0 ? (
        <EmptyState icon="file-document-outline" title="Chưa có hợp đồng nào" />
      ) : (
        contracts.map((c) => {
          const slot = slots.find((s) => s.id === c.slotId);
          return (
            <Card key={c.id} onPress={() => router.push(`/vendor/slots/contracts/${c.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 4 }}>
                  <Text style={[typography.headlineSm, { color: colors.text }]}>
                    {slot?.slot_code ?? c.slotId}
                  </Text>
                  <Text style={[typography.bodySm, { color: colors.muted }]}>
                    Đến {new Date(c.end_date).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <StatusChip code={c.contract_status} />
              </View>
              <View style={{ marginTop: 8 }}>
                <Money amountVnd={c.fee_monthly} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
