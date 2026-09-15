import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function InvoicesListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const invoices = useMockDb((s) => s.invoices).filter((i) => i.vendorId === user?.vendorId);

  return (
    <Screen>
      <AppHeader title="Hoá đơn" back />
      {invoices.length === 0 ? (
        <EmptyState icon="receipt" title="Chưa có hoá đơn nào" />
      ) : (
        invoices.map((inv) => (
          <Card key={inv.id} onPress={() => router.push(`/vendor/finance/invoices/${inv.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ gap: 4 }}>
                <Text style={[typography.headlineSm, { color: colors.text }]}>
                  {inv.invoice_number}
                </Text>
                <Text style={[typography.bodySm, { color: colors.muted }]}>
                  {new Date(inv.issued_at).toLocaleDateString('vi-VN')}
                </Text>
              </View>
              <Money amountVnd={inv.amount} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
