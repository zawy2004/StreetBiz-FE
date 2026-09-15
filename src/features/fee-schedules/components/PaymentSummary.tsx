import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card, Money } from '@/components/common';
import { colors, spacing, typography } from '@/theme';

type Props = {
  title: string;
  amount: number;
  dueDate?: string;
};

export function PaymentSummary({ title, amount, dueDate }: Props) {
  return (
    <>
      <Card>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>{title}</Text>
        <Money amountVnd={amount} size="lg" />
        {dueDate ? (
          <Text style={[typography.bodySm, { color: colors.muted, marginTop: 4 }]}>
            Hạn thanh toán {new Date(dueDate).toLocaleDateString('vi-VN')}
          </Text>
        ) : null}
      </Card>
      <Card padded={false}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
          }}
        >
          <MaterialCommunityIcons name="wallet-outline" size={22} color={colors.tertiary} />
          <Text style={[typography.bodyMd, { color: colors.text, flex: 1 }]}>
            Ví điện tử MoMo / ZaloPay
          </Text>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.tertiary} />
        </View>
      </Card>
    </>
  );
}
