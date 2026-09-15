import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const feeItems = useMockDb((s) => s.feeItems).filter((f) => f.contractId === id);

  if (!contract) return <ErrorState message="Không tìm thấy hợp đồng." />;

  const isActive = contract.contract_status === 'ACTIVE';

  return (
    <Screen>
      <AppHeader title={slot?.slot_code ?? 'Hợp đồng'} back subtitle={slot?.street} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Money amountVnd={contract.fee_monthly} size="lg" />
          <StatusChip code={contract.contract_status} />
        </View>
        <Text style={[typography.bodySm, { color: colors.muted }]}>
          {new Date(contract.start_date).toLocaleDateString('vi-VN')} —{' '}
          {new Date(contract.end_date).toLocaleDateString('vi-VN')}
        </Text>
      </Card>

      {isActive ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <View style={{ flexGrow: 1, minWidth: 150 }}>
            <Button
              label="Xem giấy phép QR"
              onPress={() => router.push(`/vendor/slots/contracts/${contract.id}/permit`)}
            />
          </View>
          <View style={{ flexGrow: 1, minWidth: 150 }}>
            <Button
              label="Gia hạn"
              variant="outline"
              onPress={() => router.push(`/vendor/slots/contracts/${contract.id}/renewal`)}
            />
          </View>
          <View style={{ flexGrow: 1, minWidth: 150 }}>
            <Button
              label="Chuyển nhượng"
              variant="outline"
              onPress={() => router.push(`/vendor/slots/contracts/${contract.id}/transfer`)}
            />
          </View>
          <View style={{ flexGrow: 1, minWidth: 150 }}>
            <Button
              label="Trả ô"
              variant="ghost"
              onPress={() => router.push(`/vendor/slots/contracts/${contract.id}/return`)}
            />
          </View>
        </View>
      ) : null}

      {feeItems.length > 0 ? (
        <Section title="Lịch phí">
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.md }}>
              {feeItems.map((fee, i) => (
                <View key={fee.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={fee.period_label}
                    subtitle={`Hạn ${new Date(fee.due_date).toLocaleDateString('vi-VN')}`}
                    trailing={<StatusChip code={fee.item_status} />}
                  />
                </View>
              ))}
            </View>
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
