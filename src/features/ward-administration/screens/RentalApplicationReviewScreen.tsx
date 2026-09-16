import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function RentalApplicationReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const application = useMockDb((s) => s.applications.find((a) => a.id === id));
  const slots = useMockDb((s) => s.slots);
  const vendors = useMockDb((s) => s.vendors);
  const approve = useMockDb((s) => s.approveRentalApplication);
  const reject = useMockDb((s) => s.rejectRentalApplication);

  if (!application) return <ErrorState message="Không tìm thấy đơn thuê." />;
  const vendor = vendors.find((v) => v.id === application.vendorId);

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button
              label="Từ chối"
              variant="danger"
              onPress={() => {
                reject(application.id, 'Không phù hợp quy hoạch');
                showToast('Đã từ chối đơn');
                navigate(-1);
              }}
            />
          </div>
          <div className="flex-1">
            <Button
              label="Duyệt & cấp phép"
              variant="approve"
              onPress={() => {
                approve(application.id);
                showToast('Đã duyệt, hợp đồng và giấy phép QR đã được tạo');
                navigate(-1);
              }}
            />
          </div>
        </StickyActions>
      }
    >
      <AppHeader title={vendor?.business_name ?? 'Đơn thuê ô'} back />
      <StatusChip code={application.application_status} />
      <Section title="Ô đề nghị thuê">
        <Card padded={false}>
          <div className="px-md">
            {application.slotIds.map((slotId, i) => {
              const slot = slots.find((s) => s.id === slotId);
              if (!slot) return null;
              return (
                <div key={slotId}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={slot.slot_code}
                    subtitle={`${slot.street} · ${slot.size_m2} m²`}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </Section>
    </Screen>
  );
}
