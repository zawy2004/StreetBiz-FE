import type { IconName } from '@/components/common';
import type { VendorReportResolution, VendorReportType } from '@/core/api/ai-api';
import type { StatusTone } from '@/theme';

/** What a report is about, in the words on the buttons that file it (BUY-05 / BUY-07). */
export const REPORT_TYPE_LABELS: Record<VendorReportType, string> = {
  OVERCHARGE: 'Bị tính cao hơn giá niêm yết',
  PRICE_NOT_POSTED: 'Quầy không treo bảng giá',
  GENERAL: 'Phản ánh khác',
};

/** The same, in English, for the bilingual public page. */
export const REPORT_TYPE_LABELS_EN: Record<VendorReportType, string> = {
  OVERCHARGE: 'Charged above the posted price',
  PRICE_NOT_POSTED: 'No price board at the stall',
  GENERAL: 'Other report',
};

/** Short names for lists and chips. */
export const REPORT_TYPE_SHORT: Record<VendorReportType, string> = {
  OVERCHARGE: 'Bán cao hơn giá niêm yết',
  PRICE_NOT_POSTED: 'Không treo bảng giá',
  GENERAL: 'Phản ánh khác',
};

export const REPORT_TYPE_ICONS: Record<VendorReportType, IconName> = {
  OVERCHARGE: 'cash-multiple',
  PRICE_NOT_POSTED: 'tag-outline',
  GENERAL: 'flag-outline',
};

export const REPORT_TYPES: VendorReportType[] = ['OVERCHARGE', 'PRICE_NOT_POSTED', 'GENERAL'];

export function isReportType(value: string | null | undefined): value is VendorReportType {
  return value === 'OVERCHARGE' || value === 'PRICE_NOT_POSTED' || value === 'GENERAL';
}

export const reportTypeShort = (type: string | null | undefined) =>
  isReportType(type) ? REPORT_TYPE_SHORT[type] : REPORT_TYPE_SHORT.GENERAL;

/** How the ward closed a report, as the reporter and the officer read it. */
export const RESOLUTION_LABELS: Record<
  VendorReportResolution,
  { label: string; tone: StatusTone }
> = {
  DISMISSED: { label: 'Không chấp nhận', tone: 'neutral' },
  MEDIATED: { label: 'Đã hòa giải', tone: 'ok' },
  VIOLATION_RECORDED: { label: 'Đã lập biên bản', tone: 'ok' },
};

export const resolutionLabel = (resolution: string | null | undefined) =>
  resolution && resolution in RESOLUTION_LABELS
    ? RESOLUTION_LABELS[resolution as VendorReportResolution]
    : null;

/** The violation types a report suggests when the officer raises a biên bản (rule-based, not AI). */
export const SUGGESTED_VIOLATION_LABELS: Record<string, string> = {
  PRICE_ABOVE_POSTED: 'Bán cao hơn giá niêm yết',
  PRICE_NOT_POSTED: 'Không niêm yết giá',
};
