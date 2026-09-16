import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { SelectField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

type Action = 'SUSPEND' | 'REVOKE';

export function PermitActionScreen() {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  const permit = useMockDb((s) => s.permits.find((p) => p.id === permitId));
  const vendors = useMockDb((s) => s.vendors);
  const contracts = useMockDb((s) => s.contracts);
  const suspend = useMockDb((s) => s.suspendPermit);
  const revoke = useMockDb((s) => s.revokePermit);
  const [action, setAction] = useState<Action>('SUSPEND');

  if (!permit) return <ErrorState message="Không tìm thấy giấy phép." />;
  const contract = contracts.find((c) => c.id === permit.contractId);
  const vendor = vendors.find((v) => v.id === contract?.vendorId);

  const submit = () => {
    if (action === 'SUSPEND') suspend(permit.id);
    else revoke(permit.id);
    showToast(action === 'SUSPEND' ? 'Đã tạm đình chỉ giấy phép' : 'Đã thu hồi giấy phép');
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Xác nhận" variant="danger" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đình chỉ / thu hồi giấy phép" back subtitle={vendor?.business_name} />
      <Card>
        <p className="text-body-md text-muted">Trạng thái hiện tại</p>
        <StatusChip code={permit.permit_status} />
      </Card>
      <SelectField
        label="Hành động"
        value={action}
        onChange={setAction}
        options={[
          {
            value: 'SUSPEND',
            label: 'Tạm đình chỉ',
            description: 'Dùng cho vi phạm mức nhẹ, có thể khôi phục sau khi khắc phục',
          },
          {
            value: 'REVOKE',
            label: 'Thu hồi vĩnh viễn',
            description: 'Vi phạm nghiêm trọng hoặc nợ phí kéo dài',
          },
        ]}
      />
    </Screen>
  );
}
