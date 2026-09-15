import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { SegmentedControl } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

type Tab = 'FEES' | 'PENALTIES' | 'INVOICES';

export function FinanceHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const feeItems = useMockDb((s) => s.feeItems).filter((f) => f.vendorId === user?.vendorId);
  const penalties = useMockDb((s) => s.penalties).filter((p) => p.vendorId === user?.vendorId);
  const invoices = useMockDb((s) => s.invoices).filter((i) => i.vendorId === user?.vendorId);
  const [tab, setTab] = useState<Tab>('FEES');

  const pendingFees = feeItems.filter((f) => f.item_status === 'PENDING');
  const pendingPenalties = penalties.filter((p) => p.penalty_status === 'PENDING');
  const totalDue =
    pendingFees.reduce((sum, f) => sum + f.amount, 0) +
    pendingPenalties.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Screen>
      <AppHeader title="Tài chính" />
      <Card style={{ backgroundColor: colors.indigo }}>
        <Text style={[typography.bodyMd, { color: '#C7CCDB' }]}>Tổng cần thanh toán</Text>
        <Money amountVnd={totalDue} size="lg" color={colors.white} />
      </Card>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'FEES', label: 'Phí thuê ô' },
          { value: 'PENALTIES', label: 'Biên bản phạt' },
          { value: 'INVOICES', label: 'Hoá đơn' },
        ]}
      />

      {tab === 'FEES' ? (
        <Section>
          {feeItems.length === 0 ? (
            <EmptyState icon="cash-multiple" title="Chưa có khoản phí nào" />
          ) : (
            feeItems.map((f) => (
              <Card
                key={f.id}
                onPress={
                  f.item_status === 'PENDING'
                    ? () => router.push(`/vendor/finance/fees/${f.id}/payment`)
                    : undefined
                }
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ gap: 4 }}>
                    <Text style={[typography.headlineSm, { color: colors.text }]}>
                      {f.period_label}
                    </Text>
                    <Text style={[typography.bodySm, { color: colors.muted }]}>
                      Hạn {new Date(f.due_date).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Money amountVnd={f.amount} />
                    <StatusChip code={f.item_status} />
                  </View>
                </View>
              </Card>
            ))
          )}
        </Section>
      ) : null}

      {tab === 'PENALTIES' ? (
        <Section>
          {penalties.length === 0 ? (
            <EmptyState icon="alert-octagon-outline" title="Không có biên bản phạt" />
          ) : (
            penalties.map((p) => (
              <Card
                key={p.id}
                onPress={
                  p.penalty_status === 'PENDING'
                    ? () => router.push(`/vendor/finance/penalties/${p.id}/payment`)
                    : undefined
                }
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, gap: 4, paddingRight: spacing.sm }}>
                    <Text style={[typography.headlineSm, { color: colors.text }]} numberOfLines={2}>
                      {p.reason}
                    </Text>
                    <Text style={[typography.bodySm, { color: colors.muted }]}>
                      {new Date(p.issued_at).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Money amountVnd={p.amount} />
                    <StatusChip code={p.penalty_status} />
                  </View>
                </View>
              </Card>
            ))
          )}
        </Section>
      ) : null}

      {tab === 'INVOICES' ? (
        <Section>
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
        </Section>
      ) : null}

      <Button
        label="Lịch sử thanh toán"
        variant="outline"
        onPress={() => router.push('/vendor/finance/payments')}
      />
      <Button
        label="Lịch sử vi phạm"
        variant="ghost"
        onPress={() => router.push('/vendor/finance/violations')}
      />
    </Screen>
  );
}
