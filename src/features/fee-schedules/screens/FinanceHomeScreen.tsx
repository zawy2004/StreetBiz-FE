import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { SegmentedControl } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { alpha, colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

type Tab = 'FEES' | 'PENALTIES' | 'INVOICES';

export function FinanceHomeScreen() {
  const navigate = useNavigate();
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
      <Card className="!border-transparent !bg-indigo">
        <div className="flex flex-col gap-2xs">
          <span className="text-body-md" style={{ color: alpha(colors.onIndigo, 0.72) }}>
            Tổng cần thanh toán
          </span>
          <Money amountVnd={totalDue} size="lg" color={colors.onIndigo} />
        </div>
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
                    ? () => navigate(`/vendor/finance/fees/${f.id}/payment`)
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2xs">
                    <span className="text-headline-sm text-text">{f.period_label}</span>
                    <span className="text-body-sm text-muted">
                      Hạn {new Date(f.due_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2xs">
                    <Money amountVnd={f.amount} />
                    <StatusChip code={f.item_status} />
                  </div>
                </div>
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
                    ? () => navigate(`/vendor/finance/penalties/${p.id}/payment`)
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 flex-col gap-2xs pr-sm">
                    <span className="line-clamp-2 text-headline-sm text-text">{p.reason}</span>
                    <span className="text-body-sm text-muted">
                      {new Date(p.issued_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2xs">
                    <Money amountVnd={p.amount} />
                    <StatusChip code={p.penalty_status} />
                  </div>
                </div>
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
              <Card key={inv.id} onPress={() => navigate(`/vendor/finance/invoices/${inv.id}`)}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2xs">
                    <span className="text-headline-sm text-text">{inv.invoice_number}</span>
                    <span className="text-body-sm text-muted">
                      {new Date(inv.issued_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <Money amountVnd={inv.amount} />
                </div>
              </Card>
            ))
          )}
        </Section>
      ) : null}

      <Button
        label="Lịch sử thanh toán"
        variant="outline"
        onPress={() => navigate('/vendor/finance/payments')}
      />
      <Button
        label="Lịch sử vi phạm"
        variant="ghost"
        onPress={() => navigate('/vendor/finance/violations')}
      />
    </Screen>
  );
}
