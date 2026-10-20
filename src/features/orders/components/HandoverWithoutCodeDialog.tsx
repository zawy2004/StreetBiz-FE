import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { BottomSheet } from '@/components/layout';

/** Matches the backend rule, so a reason the seller can type is a reason it accepts. */
export const MIN_HANDOVER_REASON_LENGTH = 6;
export const MAX_HANDOVER_REASON_LENGTH = 500;

/**
 * ORD-06: handing an order over when there is no code to read.
 *
 * The reason is not paperwork. It is written into the order's history, where the
 * buyer reads it next to "đã giao", so this sheet says plainly that it will be
 * seen - a seller who knows that thinks twice before using this instead of the
 * scanner.
 */
export function HandoverWithoutCodeDialog({
  visible,
  reason,
  pending,
  onReasonChange,
  onConfirm,
  onClose,
  error: failure,
}: {
  visible: boolean;
  reason: string;
  pending: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  /** The server's refusal, shown inside the sheet while it is open (the one alert on screen). */
  error?: string;
}) {
  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_HANDOVER_REASON_LENGTH;
  // Worded exactly as the backend refuses the same input (OrderPickupMessages),
  // so the seller never reads two different sentences for one mistake.
  const error = visible
    ? trimmed.length === 0
      ? 'Phải ghi lý do khi giao đơn mà không có mã.'
      : tooShort
        ? 'Lý do quá ngắn. Hãy ghi rõ vì sao không đọc được mã của khách.'
        : undefined
    : undefined;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <div className="flex items-start gap-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          <Icon name="clipboard-text-outline" size={22} color="currentColor" weight="duotone" />
        </span>
        <h2 className="font-sign text-[22px] font-bold leading-7 tracking-[-0.01em] text-text">
          Giao đơn khi khách không có mã
        </h2>
      </div>
      <p className="rounded-[14px] bg-sunken/70 px-sm py-xs text-[16px] leading-6 text-text">
        Chỉ dùng khi không thể quét mã QR và khách cũng không đọc được mã 8 ký tự. Lý do bạn ghi sẽ
        lưu vào lịch sử đơn và khách hàng đọc được.
      </p>
      <TextField
        label="Lý do giao đơn không có mã"
        helperText="VD: Khách hết pin điện thoại, đã đối chiếu tên và món."
        value={reason}
        onChangeText={onReasonChange}
        maxLength={MAX_HANDOVER_REASON_LENGTH}
        multiline
        error={error}
      />
      {failure ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-[16px] font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon
            name="alert-octagon-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          <span className="text-error !text-[#8F1717] dark:!text-[#FF9A90]">{failure}</span>
        </p>
      ) : null}
      <div className="[&>button]:h-14">
        <Button
          label="Xác nhận đã giao đơn"
          loading={pending}
          disabled={trimmed.length < MIN_HANDOVER_REASON_LENGTH}
          onPress={onConfirm}
        />
      </div>
    </BottomSheet>
  );
}
