import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function AdjacentSlotScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const registration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const slots = useMockDb((s) => s.slots);
  const submitRentalApplication = useMockDb((s) => s.submitRentalApplication);

  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  // Demo auto-suggestion: nearest available slot on the same street.
  const suggested = slots.find((s) => s.slot_status === 'AVAILABLE');

  const submit = () => {
    if (!suggested) return;
    submitRentalApplication({
      vendorId: registration.vendorId,
      slotIds: [suggested.id],
      application_type: 'STOREFRONT_ADJACENT',
    });
    showToast('Đã gửi đơn thuê ô liền kề');
    navigate('/vendor/slots/rental-applications', { replace: true });
  };

  return (
    <Screen
      footer={
        suggested ? (
          <StickyActions>
            <Button label="Gửi đơn thuê ô này" onPress={submit} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Ô liền kề mặt tiền" back subtitle={registration.address} />
      {!suggested ? (
        <EmptyState
          icon="map-marker-off-outline"
          title="Chưa có ô liền kề khả dụng"
          description="Phường chưa số hoá ô liền kề tại địa chỉ này."
        />
      ) : (
        <Card>
          <div className="flex justify-between">
            <div className="flex flex-col gap-2xs">
              <span className="text-headline-sm text-text">{suggested.slot_code}</span>
              <span className="text-body-md text-muted">{suggested.street}</span>
              <span className="text-body-sm text-muted">
                {suggested.size_m2} m² · {suggested.time_window}
              </span>
            </div>
            <StatusChip code={suggested.slot_status} />
          </div>
          <div className="mt-sm">
            <Money amountVnd={suggested.price_monthly} size="lg" />
            <p className="text-body-sm text-muted">mỗi tháng</p>
          </div>
        </Card>
      )}
    </Screen>
  );
}
