import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function SlotDetailScreen() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === slotId));
  const submitRentalApplication = useMockDb((s) => s.submitRentalApplication);

  if (!slot) return <ErrorState message="Không tìm thấy ô." />;

  const apply = () => {
    if (!user?.vendorId) return;
    submitRentalApplication({
      vendorId: user.vendorId,
      slotIds: [slot.id],
      application_type: 'OPEN_SLOT',
    });
    showToast('Đã gửi đơn thuê ô');
    navigate('/vendor/slots/rental-applications');
  };

  return (
    <Screen
      footer={
        slot.slot_status === 'AVAILABLE' ? (
          <StickyActions>
            <Button label="Nộp đơn thuê ô này" onPress={apply} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={slot.slot_code} back subtitle={slot.street} />
      <Card>
        <div className="flex justify-between">
          <Money amountVnd={slot.price_monthly} size="lg" />
          <StatusChip code={slot.slot_status} />
        </div>
        <p className="text-body-sm text-muted">mỗi tháng</p>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          <ListRow title="Diện tích" subtitle={`${slot.size_m2} m²`} />
          <Divider />
          <ListRow title="Khung giờ hoạt động" subtitle={slot.time_window} />
          <Divider />
          <ListRow title="Tuyến đường" subtitle={slot.street} />
        </div>
      </Card>
    </Screen>
  );
}
