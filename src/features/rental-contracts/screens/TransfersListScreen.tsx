import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function TransfersListScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const transfers = useMockDb((s) => s.transfers);
  const slots = useMockDb((s) => s.slots);
  const contracts = useMockDb((s) => s.contracts);

  const outgoing = transfers.filter((t) => t.fromVendorId === user?.vendorId);
  const incoming = transfers.filter(
    (t) =>
      t.toVendorPhone.replace(/\D/g, '') === user?.phone.replace(/\D/g, '') &&
      t.transfer_status === 'PENDING',
  );

  const slotLabel = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    return slots.find((s) => s.id === contract?.slotId)?.slot_code ?? contractId;
  };

  return (
    <Screen>
      <AppHeader title="Chuyển nhượng ô" back />

      <Section title="Yêu cầu gửi đến bạn">
        {incoming.length === 0 ? (
          <EmptyState icon="swap-horizontal" title="Không có yêu cầu nào" />
        ) : (
          incoming.map((t) => (
            <Card key={t.id} onPress={() => navigate(`/vendor/slots/transfers/${t.id}/accept`)}>
              <span className="text-headline-sm text-text">{slotLabel(t.contractId)}</span>
              <p className="text-body-sm text-muted">Nhấn để xem &amp; chấp nhận</p>
            </Card>
          ))
        )}
      </Section>

      <Section title="Yêu cầu đã gửi">
        {outgoing.length === 0 ? (
          <EmptyState icon="swap-horizontal" title="Chưa gửi yêu cầu nào" />
        ) : (
          outgoing.map((t) => (
            <Card key={t.id}>
              <div className="flex justify-between">
                <div className="flex flex-col gap-2xs">
                  <span className="text-headline-sm text-text">{slotLabel(t.contractId)}</span>
                  <span className="text-body-sm text-muted">Tới {t.toVendorPhone}</span>
                </div>
                <StatusChip code={t.transfer_status} />
              </div>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
