import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function RenewalReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const renewal = useMockDb((s) => s.renewals.find((r) => r.id === id));
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === renewal?.contractId));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const approveRenewal = useMockDb((s) => s.approveRenewal);

  if (!renewal) return <ErrorState message="Không tìm thấy yêu cầu gia hạn." />;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Duyệt gia hạn"
            variant="approve"
            onPress={() => {
              approveRenewal(renewal.id);
              showToast('Đã duyệt gia hạn');
              navigate(-1);
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Duyệt gia hạn hợp đồng" back subtitle={slot?.slot_code} />
      <Card>
        <p className="text-body-md text-muted">Hết hạn hiện tại</p>
        <p className="text-headline-sm text-text">
          {contract ? new Date(contract.end_date).toLocaleDateString('vi-VN') : '—'}
        </p>
        <div className="h-2" />
        <p className="text-body-md text-muted">Hết hạn mới đề nghị</p>
        <p className="text-headline-sm text-primary">
          {new Date(renewal.new_end_date).toLocaleDateString('vi-VN')}
        </p>
      </Card>
    </Screen>
  );
}
