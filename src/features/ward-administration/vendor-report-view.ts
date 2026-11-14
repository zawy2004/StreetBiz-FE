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

export const REPORT_TYPE_FILTERS = [
  { value: 'ALL', label: 'Mọi loại' },
  { value: 'OVERCHARGE', label: 'Bán cao hơn giá' },
  { value: 'PRICE_NOT_POSTED', label: 'Không treo bảng giá' },
  { value: 'GENERAL', label: 'Phản ánh khác' },
] as const;

/** What "Lập biên bản" writes into the record's description from a report (the officer edits it). */
export function violationDescriptionFromReport(report: {
  reportId: number | string;
  reason: string;
  priceEvidence?: {
    itemName: string;
    priceUnit: string;
    postedUnitPrice: number;
    priceVersion: number;
    quantity: number;
    postedAmount: number;
    chargedAmount: number;
    difference: number;
  } | null;
}): string {
  const vnd = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;
  const parts = [`Từ phản ánh #${report.reportId} của người dân: ${report.reason.trim()}`];
  const e = report.priceEvidence;
  if (e) {
    parts.push(
      `Bằng chứng giá: ${e.quantity} ${e.priceUnit} ${e.itemName}, giá niêm yết ${vnd(e.postedUnitPrice)}/${e.priceUnit} (bảng giá bản số ${e.priceVersion}) = ${vnd(e.postedAmount)}; khách bị tính ${vnd(e.chargedAmount)}, cao hơn ${vnd(e.difference)}.`,
    );
  }
  return parts.join(' ').slice(0, 1000);
}

/**
 * "Lập biên bản" from a report: the record form with the vendor, the slot and the report it
 * will close (the form reads the rest of the report itself).
 */
export function violationFormPath(report: {
  reportId: number | string;
  vendorId?: number | string | null;
  slotId?: number | string | null;
}): string {
  const query = new URLSearchParams({ sourceReportId: String(report.reportId) });
  if (report.vendorId) query.set('vendorId', String(report.vendorId));
  if (report.slotId) query.set('slotId', String(report.slotId));
  return `/ward/patrol/violations/new?${query.toString()}`;
}
