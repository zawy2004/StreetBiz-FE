import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

const RENEW_MONTHS = 3;

export function RenewalRequestScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const requestRenewal = useMockDb((s) => s.requestRenewal);

  if (!contract) return <ErrorState message="Không tìm thấy hợp đồng." />;

  const currentEnd = new Date(contract.end_date);
  const newEnd = new Date(currentEnd);
  newEnd.setMonth(newEnd.getMonth() + RENEW_MONTHS);

  const submit = () => {
    requestRenewal(contract.id, newEnd.toISOString());
    showToast('Đã gửi yêu cầu gia hạn');
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi yêu cầu gia hạn" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Gia hạn hợp đồng" back />
      <Card>
        <p className="text-body-md text-muted">Hết hạn hiện tại</p>
        <p className="mb-sm text-headline-sm text-text">
          {currentEnd.toLocaleDateString('vi-VN')}
        </p>
        <p className="text-body-md text-muted">
          Gia hạn thêm {RENEW_MONTHS} tháng, hết hạn mới
        </p>
        <p className="text-headline-sm text-primary">{newEnd.toLocaleDateString('vi-VN')}</p>
      </Card>
    </Screen>
  );
}
