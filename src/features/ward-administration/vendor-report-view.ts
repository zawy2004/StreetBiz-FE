import type { PermitPrecheck, VendorReportFlag } from '@/core/api/ai-api';
import type { StatusTone } from '@/theme';

/** The officer's words for each flag the system raises beside a citizen report (AIB-01). */
export const FLAG_LABELS: Record<VendorReportFlag, { label: string; tone: StatusTone }> = {
  NO_PHOTO: { label: 'Phản ánh không kèm ảnh', tone: 'neutral' },
  NO_PERMIT_VISIBLE_IN_PHOTO: { label: 'Không thấy giấy phép trong ảnh', tone: 'pending' },
  SIGNAGE_DIFFERS_FROM_REGISTERED_NAME: {
    label: 'Tên trên biển hiệu khác tên đã đăng ký',
    tone: 'pending',
  },
  PERMIT_NOT_VALID: { label: 'Giấy phép đã quét không còn hiệu lực', tone: 'danger' },
  PERMIT_SLOT_MISMATCH: { label: 'Giấy phép thuộc ô khác với ô được nêu', tone: 'danger' },
};

export const flagLabel = (flag: string) =>
  FLAG_LABELS[flag as VendorReportFlag] ?? { label: flag, tone: 'neutral' as StatusTone };

export const PERMIT_VISIBLE_LABELS: Record<string, string> = {
  YES: 'Có thấy giấy phép / mã QR trong ảnh',
  NO: 'Không thấy giấy phép / mã QR trong ảnh',
  UNCLEAR: 'Chưa rõ có giấy phép trong ảnh hay không',
};

/** One sentence on the permit the reporter scanned, computed by the system from the permit and contract records. */
export function permitSentence(check: PermitPrecheck): string {
  const where = check.slotCode ? ` (ô ${check.slotCode})` : '';
  const state = check.validNow ? 'còn hiệu lực' : 'không còn hiệu lực';
  return `Giấy phép #${check.permitId}${where} ${state}.`;
}

export const REPORT_STATUS_FILTERS = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'REVIEWED', label: 'Đã xem xét' },
  { value: 'DISMISSED', label: 'Đã bỏ qua' },
] as const;
