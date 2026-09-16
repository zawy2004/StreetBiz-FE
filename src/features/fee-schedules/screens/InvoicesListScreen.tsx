import { useNavigate } from 'react-router-dom';

import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function InvoicesListScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const invoices = useMockDb((s) => s.invoices).filter((i) => i.vendorId === user?.vendorId);

  return (
    <Screen>
      <AppHeader title="Hoá đơn" back />
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
    </Screen>
  );
}
