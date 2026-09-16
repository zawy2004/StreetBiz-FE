import { useParams } from 'react-router-dom';

import { Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function RentalApplicationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const application = useMockDb((s) => s.applications.find((a) => a.id === id));
  const slots = useMockDb((s) => s.slots);

  if (!application) return <ErrorState message="Không tìm thấy đơn." />;

  return (
    <Screen>
      <AppHeader title="Chi tiết đơn thuê" back />
      <Card>
        <div className="flex justify-between">
          <span className="text-headline-sm text-text">
            {application.application_type === 'STOREFRONT_ADJACENT' ? 'Ô liền kề mặt tiền' : 'Ô mở'}
          </span>
          <StatusChip code={application.application_status} />
        </div>
        <p className="mt-1 text-body-sm text-muted">
          Nộp ngày {new Date(application.submitted_at).toLocaleDateString('vi-VN')}
        </p>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          {application.slotIds.map((slotId, i) => {
            const slot = slots.find((s) => s.id === slotId);
            if (!slot) return null;
            return (
              <div key={slotId}>
                {i > 0 ? <Divider /> : null}
                <ListRow title={slot.slot_code} subtitle={`${slot.street} · ${slot.size_m2} m²`} />
              </div>
            );
          })}
        </div>
      </Card>
    </Screen>
  );
}
