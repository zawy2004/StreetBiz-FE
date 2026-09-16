import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function AddressConflictReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const request = useMockDb((s) => s.addressChanges.find((a) => a.id === id));
  const slots = useMockDb((s) => s.slots);
  const resolve = useMockDb((s) => s.resolveAddressChange);

  if (!request) return <ErrorState message="Không tìm thấy yêu cầu." />;

  const conflicting = slots.find(
    (s) => request.new_address.includes(s.street) && s.slot_status === 'RENTED',
  );

  const act = (approve: boolean) => {
    resolve(request.id, approve);
    showToast(
      approve ? 'Đã duyệt đổi địa chỉ, ô cũ được giải phóng sau thời gian ân hạn' : 'Đã từ chối',
    );
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button label="Từ chối" variant="danger" onPress={() => act(false)} />
          </div>
          <div className="flex-1">
            <Button
              label={conflicting ? 'Xếp hàng ưu tiên' : 'Duyệt'}
              variant="approve"
              onPress={() => act(true)}
            />
          </div>
        </StickyActions>
      }
    >
      <AppHeader title="Đổi địa chỉ kinh doanh" back />
      <Card>
        <p className="text-body-md text-muted">Địa chỉ mới</p>
        <p className="text-headline-sm text-text">{request.new_address}</p>
      </Card>
      {conflicting ? (
        <Card style={{ backgroundColor: '#E09F3E18', borderColor: '#E09F3E40' }}>
          <p className="text-body-md text-on-secondary">
            Ô liền kề tại địa chỉ mới ({conflicting.slot_code}) hiện đã có người thuê. Có thể xếp hộ
            kinh doanh này vào hàng ưu tiên khi ô trống, hoặc từ chối yêu cầu.
          </p>
        </Card>
      ) : null}
    </Screen>
  );
}
