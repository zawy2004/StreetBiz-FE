import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function AcceptTransferScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const transfer = useMockDb((s) => s.transfers.find((t) => t.id === id));
  const registrations = useMockDb((s) => s.registrations).filter(
    (r) => r.vendorId === user?.vendorId,
  );
  const acceptTransfer = useMockDb((s) => s.acceptTransfer);

  if (!transfer) return <ErrorState message="Không tìm thấy yêu cầu." />;

  const hasApprovedRegistration = registrations.some((r) => r.registration_status === 'APPROVED');

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Chấp nhận chuyển nhượng"
            disabled={!hasApprovedRegistration || !user?.vendorId}
            onPress={() => {
              if (!user?.vendorId) return;
              acceptTransfer(transfer.id, user.vendorId);
              showToast('Đã gửi yêu cầu, chờ Phường duyệt');
              navigate(-1);
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Chấp nhận chuyển nhượng" back />
      <Card>
        <p className="text-body-md text-text">
          Một hộ kinh doanh muốn chuyển nhượng ô đang thuê cho bạn. Yêu cầu cần Phường duyệt trước
          khi có hiệu lực.
        </p>
      </Card>
      {!hasApprovedRegistration ? (
        <Card style={{ backgroundColor: '#E09F3E18', borderColor: '#E09F3E40' }}>
          <p className="text-body-md text-on-secondary">
            Bạn cần có hồ sơ đăng ký kinh doanh đã được duyệt trước khi nhận chuyển nhượng.
          </p>
        </Card>
      ) : null}
    </Screen>
  );
}
