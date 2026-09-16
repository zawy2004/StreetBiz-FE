import { useParams } from 'react-router-dom';

import { Card, Divider, ListRow, QrCode } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function DigitalPermitScreen() {
  const { id } = useParams<{ id: string }>();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const permit = useMockDb((s) => s.permits.find((p) => p.contractId === id));

  if (!contract || !permit) return <ErrorState message="Không tìm thấy giấy phép." />;

  return (
    <Screen>
      <AppHeader title="Giấy phép số" back />
      <Card>
        <div className="flex flex-col items-center gap-sm">
          <StatusChip code={permit.permit_status} />
          <QrCode value={permit.permit_code} />
          <span className="text-code text-text">{permit.permit_code}</span>
        </div>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          <ListRow title="Ô cấp phép" subtitle={`${slot?.slot_code} · ${slot?.street}`} />
          <Divider />
          <ListRow title="Diện tích" subtitle={`${slot?.size_m2} m²`} />
          <Divider />
          <ListRow title="Khung giờ" subtitle={slot?.time_window} />
          <Divider />
          <ListRow
            title="Hiệu lực đến"
            subtitle={new Date(permit.expires_at).toLocaleDateString('vi-VN')}
          />
        </div>
      </Card>
    </Screen>
  );
}
