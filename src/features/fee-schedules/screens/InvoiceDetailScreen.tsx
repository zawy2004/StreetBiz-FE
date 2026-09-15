import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoice = useMockDb((s) => s.invoices.find((i) => i.id === id));
  const feeItem = useMockDb((s) => s.feeItems.find((f) => f.id === invoice?.feeItemId));

  if (!invoice) return <ErrorState message="Không tìm thấy hoá đơn." />;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Tải hoá đơn (PDF)"
            variant="outline"
            onPress={() => showToast('Đã lưu hoá đơn vào thiết bị (demo)')}
          />
        </StickyActions>
      }
    >
      <AppHeader title={invoice.invoice_number} back />
      <Card>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <MaterialCommunityIcons name="receipt" size={32} color={colors.tertiary} />
          <Money amountVnd={invoice.amount} size="lg" />
          <Text style={[typography.bodySm, { color: colors.muted }]}>
            Xuất ngày {new Date(invoice.issued_at).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </Card>
      {feeItem ? (
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListRow title="Khoản phí" subtitle={feeItem.period_label} />
            <Divider />
            <ListRow title="Trạng thái" subtitle="Đã thanh toán" />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
