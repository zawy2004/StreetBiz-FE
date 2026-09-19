import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function ContractDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const feeItems = useMockDb((s) => s.feeItems).filter((f) => f.contractId === id);

  if (!contract) return <ErrorState message="Không tìm thấy hợp đồng." />;

  const isActive = contract.contract_status === 'ACTIVE';

  return (
    <Screen>
      <AppHeader title={slot?.slot_code ?? 'Hợp đồng'} back subtitle={slot?.street} />
      <Card>
        <div className="flex justify-between">
          <Money amountVnd={contract.fee_monthly} size="lg" />
          <StatusChip code={contract.contract_status} />
        </div>
        <p className="text-body-sm text-muted">
          {new Date(contract.start_date).toLocaleDateString('vi-VN')} —{' '}
          {new Date(contract.end_date).toLocaleDateString('vi-VN')}
        </p>
      </Card>

      {isActive ? (
        <div className="flex flex-wrap gap-sm">
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Xem giấy phép QR"
              onPress={() => navigate(`/vendor/slots/contracts/${contract.id}/permit`)}
            />
          </div>
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Gia hạn"
              variant="outline"
              onPress={() => navigate(`/vendor/slots/contracts/${contract.id}/renewal`)}
            />
          </div>
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Chuyển nhượng"
              variant="outline"
              onPress={() => navigate(`/vendor/slots/contracts/${contract.id}/transfer`)}
            />
          </div>
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Trả ô"
              variant="ghost"
              onPress={() => navigate(`/vendor/slots/contracts/${contract.id}/return`)}
            />
          </div>
        </div>
      ) : null}

      {feeItems.length > 0 ? (
        <Section title="Lịch phí">
          <Card padded={false}>
            <div className="px-md">
              {feeItems.map((fee, i) => (
                <div key={fee.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={fee.period_label}
                    subtitle={`Hạn ${new Date(fee.due_date).toLocaleDateString('vi-VN')}`}
                    trailing={<StatusChip code={fee.item_status} />}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
