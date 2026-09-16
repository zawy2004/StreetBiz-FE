import { useNavigate } from 'react-router-dom';

import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function ContractsListScreen() {
  const navigate = useNavigate();
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
            <Card key={c.id} onPress={() => navigate(`/vendor/slots/contracts/${c.id}`)}>
              <div className="flex justify-between">
                <div className="flex flex-col gap-2xs">
                  <span className="text-headline-sm text-text">{slot?.slot_code ?? c.slotId}</span>
                  <span className="text-body-sm text-muted">
                    Đến {new Date(c.end_date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <StatusChip code={c.contract_status} />
              </div>
              <div className="mt-xs">
                <Money amountVnd={c.fee_monthly} />
              </div>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
