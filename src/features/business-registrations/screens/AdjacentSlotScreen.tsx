import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useRegistrationDetail } from '../useRegistrations';

export function AdjacentSlotScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Resolves both a live numeric id and a mock REG-001 style id; the screen used
  // to look only in the mock store and so never found a real registration.
  const { registration, isLoading } = useRegistrationDetail(Number(id));
  const slots = useMockDb((s) => s.slots);
  const submitRentalApplication = useMockDb((s) => s.submitRentalApplication);

  if (isLoading) return <p role="status">Đang tải hồ sơ…</p>;
  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  // Demo auto-suggestion: nearest available slot on the same street. This is mock
  // fiction -- SIDE-03A requires a real slot chosen within the backend's 150 m
  // adjacency radius -- so it must not run against a live backend.
  const suggested = isLiveApi ? undefined : slots.find((s) => s.slot_status === 'AVAILABLE');

  const submit = () => {
    if (!suggested) return;
    submitRentalApplication({
      vendorId: String(registration.registrationId),
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
      <AppHeader
        title="Ô liền kề mặt tiền"
        back
        subtitle={registration.declaredAddress ?? registration.displayName}
      />
      {isLiveApi ? (
        // SIDE-03A exists on the backend (POST /api/vendor/rental-applications/adjacent)
        // but needs a real slot picker fed by GET /api/sidewalk-slots, which this
        // screen does not have yet.
        <EmptyState
          icon="map-marker-off-outline"
          title="Đang kết nối với Backend"
          description="Chức năng thuê ô liền kề sẽ dùng dữ liệu ô thật của phường. Hiện tại vui lòng chọn ô từ bản đồ ô vỉa hè."
        />
      ) : !suggested ? (
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
