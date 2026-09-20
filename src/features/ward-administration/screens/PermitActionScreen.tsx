import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { complianceApi } from '../ward-api';

type Action = 'SUSPEND' | 'REVOKE';

export function PermitActionScreen() {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();

  // Mock DB fallback
  const permit = useMockDb((s) => s.permits.find((p) => p.id === permitId));
  const vendors = useMockDb((s) => s.vendors);
  const contracts = useMockDb((s) => s.contracts);
  const suspend = useMockDb((s) => s.suspendPermit);
  const revoke = useMockDb((s) => s.revokePermit);

  const [action, setAction] = useState<Action>('SUSPEND');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!permit && !isLiveApi) return <ErrorState message="Không tìm thấy giấy phép." />;
  const contract = contracts.find((c) => c.id === permit?.contractId);
  const vendor = vendors.find((v) => v.id === contract?.vendorId);

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5 || trimmed.length > 500) {
      showToast('Vui lòng nhập lý do xử lý cụ thể (từ 5 đến 500 ký tự — BR-35)');
      return;
    }

    if (isLiveApi && permitId) {
      setLoading(true);
      try {
        const idNum = Number(permitId);
        await complianceApi.permitAction(idNum, action, trimmed);
        showToast(
          action === 'SUSPEND'
            ? 'Đã tạm đình chỉ giấy phép sử dụng hè phố'
            : 'Đã thu hồi giấy phép sử dụng hè phố',
        );
        navigate(-1);
        return;
      } catch (err: any) {
        showToast(err.message || 'Lỗi cập nhật trạng thái giấy phép');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mock fallback
    if (permit) {
      if (action === 'SUSPEND') suspend(permit.id);
      else revoke(permit.id);
      showToast(action === 'SUSPEND' ? 'Đã tạm đình chỉ giấy phép' : 'Đã thu hồi giấy phép');
      navigate(-1);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={loading ? 'Đang xử lý...' : 'Xác nhận xử lý'}
            variant="danger"
            disabled={loading || reason.trim().length < 5}
            onPress={submit}
          />
        </StickyActions>
      }
    >
      <AppHeader
        title="Đình chỉ / Thu hồi giấy phép"
        subtitle={vendor?.business_name ?? `Giấy phép #${permitId} (WARD-13)`}
        back
      />

      <Card>
        <p className="text-body-sm text-muted">Trạng thái giấy phép hiện tại</p>
        <div className="mt-1 flex items-center gap-2">
          <StatusChip code={permit?.permit_status ?? 'ACTIVE'} />
          <span className="text-body-xs text-muted">Mã: {permitId}</span>
        </div>
      </Card>

      <SelectField
        label="Hành động xử lý hành chính"
        value={action}
        onChange={setAction}
        options={[
          {
            value: 'SUSPEND',
            label: 'Tạm đình chỉ giấy phép',
            description: 'Áp dụng cho vi phạm trật tự hè phố chờ khắc phục hoặc chậm nộp phí',
          },
          {
            value: 'REVOKE',
            label: 'Thu hồi vĩnh viễn giấy phép',
            description: 'Vi phạm nghiêm trọng, tái phạm nhiều lần hoặc chuyển nhượng trái phép',
          },
        ]}
      />

      <TextField
        label="Lý do xử lý bắt buộc (BR-35: 5 - 500 ký tự)"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="Ghi rõ hành vi vi phạm, số biên bản hoặc căn cứ pháp lý để đình chỉ / thu hồi..."
      />

      <Card>
        <p className="text-body-sm text-muted">
          * Căn cứ BR-19 &amp; BR-35: Ngay sau khi quyết định có hiệu lực, Giấy phép số QR sẽ lập tức chuyển sang trạng thái tương ứng trên máy chủ, người dân và lực lượng tuần tra quét mã sẽ thấy cảnh báo không hợp lệ.
        </p>
      </Card>
    </Screen>
  );
}
