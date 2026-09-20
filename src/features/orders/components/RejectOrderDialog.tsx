import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { BottomSheet } from '@/components/layout';

export function RejectOrderDialog({
  visible,
  reason,
  pending,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  reason: string;
  pending: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const error = visible && !reason.trim() ? 'Vui lòng nhập lý do từ chối.' : undefined;
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <h2 className="text-headline-md text-text">Từ chối đơn hàng</h2>
      <p className="text-body-md text-muted">
        Đơn đã thanh toán sẽ được tạo yêu cầu hoàn tiền tự động.
      </p>
      <TextField
        label="Lý do từ chối"
        value={reason}
        onChangeText={onReasonChange}
        maxLength={500}
        multiline
        error={error}
      />
      <Button
        label="Xác nhận từ chối"
        variant="danger"
        loading={pending}
        disabled={!reason.trim() || reason.length > 500}
        onPress={onConfirm}
      />
    </BottomSheet>
  );
}
