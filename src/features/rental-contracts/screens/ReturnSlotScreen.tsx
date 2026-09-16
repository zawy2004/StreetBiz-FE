import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function ReturnSlotScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const returnSlot = useMockDb((s) => s.returnSlot);
  const [confirm, setConfirm] = useState(false);

  if (!contract) return <ErrorState message="Không tìm thấy hợp đồng." />;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Trả ô này" variant="danger" onPress={() => setConfirm(true)} />
        </StickyActions>
      }
    >
      <AppHeader title="Trả ô vỉa hè" back subtitle={slot?.slot_code} />
      <Card>
        <p className="text-body-md text-muted">
          Sau khi trả ô, giấy phép số sẽ hết hiệu lực và ô sẽ được mở lại cho các hộ kinh doanh
          khác. Vui lòng thanh toán mọi khoản phí còn nợ trước khi trả ô.
        </p>
      </Card>
      <ConfirmDialog
        visible={confirm}
        title="Xác nhận trả ô?"
        description="Hành động này không thể hoàn tác."
        confirmLabel="Trả ô"
        confirmVariant="danger"
        onConfirm={() => {
          returnSlot(contract.id);
          setConfirm(false);
          showToast('Đã trả ô');
          navigate('/vendor/slots/contracts', { replace: true });
        }}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
