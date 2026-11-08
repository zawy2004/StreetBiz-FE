import type {
  HouseholdStatus,
  RevenueChannel,
  TaxAnnouncementSegment,
  TaxGroup,
  TaxPeriodStatus,
  TaxReferralStatus,
  ThresholdLevel,
} from '@/core/api';
import type { StatusTone } from '@/theme';

/** The first tax year the module has rules for (the 2026 rules). */
export const FIRST_TAX_YEAR = 2026;

export function currentTaxYear(now = new Date()): number {
  return Math.max(FIRST_TAX_YEAR, now.getFullYear());
}

/** Years a household can look at, newest first: from the first rule year to this one. */
export function taxYears(now = new Date()): number[] {
  const last = currentTaxYear(now);
  return Array.from({ length: last - FIRST_TAX_YEAR + 1 }, (_, index) => last - index);
}

/** "2026-10-18" → "18/10/2026". Days are plain dates, never shifted by a timezone. */
export function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/** "2026-10-18" → "18/10". */
export function formatDayShort(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}`;
}

/** An ISO UTC moment as "14:05 18/10/2026" in the viewer's time. */
export function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

/** An ISO UTC moment as the Vietnamese calendar day, "18/10/2026". */
export function formatMomentDay(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

/** 0.015 → "1,5%". */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toLocaleString('vi-VN', { maximumFractionDigits: digits })}%`;
}

/** 1_500_000_000 → "1,5 tỷ", 500_000_000 → "500 triệu", 90_000 → "90.000 đ". */
export function formatCompactVnd(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
  }
  return `${amount.toLocaleString('vi-VN')} đ`;
}

/** Digits only, grouped for reading: "1500000" → "1.500.000". */
export function groupDigits(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "1.500.000" → 1500000; empty → 0. */
export function parseDigits(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/** Today as "YYYY-MM-DD" in Vietnamese time, for date inputs. */
export function todayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}

// ------------------------------------------------------------------------------- labels

export const GROUP_LABEL: Record<TaxGroup, string> = {
  G1: 'Nhóm 1',
  G2: 'Nhóm 2',
  G3: 'Nhóm 3',
  G4: 'Nhóm 4',
};

export const LEVEL_LABEL: Record<ThresholdLevel, string> = {
  SAFE: 'Dưới ngưỡng',
  NEAR: 'Gần ngưỡng',
  OVER: 'Đã vượt ngưỡng',
};

export const LEVEL_TONE: Record<ThresholdLevel, StatusTone> = {
  SAFE: 'ok',
  NEAR: 'pending',
  OVER: 'danger',
};

export const PERIOD_STATUS_LABEL: Record<TaxPeriodStatus, string> = {
  NOT_YET: 'Kỳ chưa kết thúc',
  OPEN: 'Đến kỳ khai',
  DUE_SOON: 'Sắp đến hạn',
  OVERDUE: 'Quá hạn',
  FILED: 'Đã nộp',
  NOT_REQUIRED: 'Chưa phải khai',
};

export const PERIOD_STATUS_TONE: Record<TaxPeriodStatus, StatusTone> = {
  NOT_YET: 'neutral',
  OPEN: 'pending',
  DUE_SOON: 'pending',
  OVERDUE: 'danger',
  FILED: 'ok',
  NOT_REQUIRED: 'neutral',
};

export const CHANNEL_LABEL: Record<RevenueChannel, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  EWALLET: 'Ví điện tử',
  OTHER: 'Khác',
};

export const CHANNEL_OPTIONS = (Object.keys(CHANNEL_LABEL) as RevenueChannel[]).map((value) => ({
  value,
  label: CHANNEL_LABEL[value],
}));

export const HOUSEHOLD_STATUS_LABEL: Record<HouseholdStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Tạm đình chỉ',
  ENDED: 'Đã ngừng',
  NOT_STARTED: 'Chưa thuê ô',
};

export const HOUSEHOLD_STATUS_TONE: Record<HouseholdStatus, StatusTone> = {
  ACTIVE: 'ok',
  SUSPENDED: 'pending',
  ENDED: 'neutral',
  NOT_STARTED: 'neutral',
};

export const REFERRAL_STATUS_LABEL: Record<TaxReferralStatus, string> = {
  PENDING: 'Chờ xử lý',
  REPORTED: 'Đã báo cơ quan thuế',
  DISMISSED: 'Không cần báo',
};

export const REFERRAL_STATUS_TONE: Record<TaxReferralStatus, StatusTone> = {
  PENDING: 'pending',
  REPORTED: 'ok',
  DISMISSED: 'neutral',
};

export const SEGMENT_LABEL: Record<TaxAnnouncementSegment, string> = {
  ALL: 'Tất cả hộ',
  NOT_FILED: 'Hộ chưa thông báo doanh thu năm',
  NO_TAX_CODE: 'Hộ chưa khai mã số thuế',
};

/** The estimate bases the API accepts, in the order the screen offers them. */
export const ESTIMATE_BASIS_OPTIONS = [
  { value: 'ACTUAL', label: 'Thực tế đến nay' },
  { value: 'PROJECTED', label: 'Dự báo cả năm' },
  { value: 'CUSTOM', label: 'Thử số khác' },
] as const;

/**
 * A tax code is 10 digits (a business), 12 (an ID number) or 13 (a branch, written 10-3);
 * dashes and spaces are ignored. Empty is allowed: it clears the code.
 */
export function validTaxCode(text: string): boolean {
  const digits = text.replace(/[\s-]/g, '');
  if (digits === '') return true;
  return /^\d+$/.test(digits) && [10, 12, 13, 14].includes(digits.length);
}
