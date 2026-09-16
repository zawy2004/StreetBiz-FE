import { Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function PaymentHistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const feeItems = useMockDb((s) => s.feeItems).filter((f) => f.vendorId === user?.vendorId);
  const penalties = useMockDb((s) => s.penalties).filter((p) => p.vendorId === user?.vendorId);

  const rows = [
    ...feeItems.map((f) => ({
      id: f.id,
      title: f.period_label,
      amount: f.amount,
      status: f.item_status,
      kind: 'Phí thuê ô',
    })),
    ...penalties.map((p) => ({
      id: p.id,
      title: p.reason,
      amount: p.amount,
      status: p.penalty_status,
      kind: 'Biên bản phạt',
    })),
  ];

  return (
    <Screen>
      <AppHeader title="Lịch sử thanh toán" back />
      {rows.length === 0 ? (
        <EmptyState icon="history" title="Chưa có giao dịch nào" />
      ) : (
        <Card padded={false}>
          <div className="px-md">
            {rows.map((row, i) => (
              <div key={row.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={row.title}
                  subtitle={row.kind}
                  trailing={
                    <div className="flex flex-col items-end gap-2xs">
                      <Money amountVnd={row.amount} />
                      <StatusChip code={row.status} />
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </Screen>
  );
}
