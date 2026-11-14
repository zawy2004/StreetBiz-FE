import { describe, expect, it } from 'vitest';

import { STATUS_LABELS, statusLabel } from '@/core/constants/status-labels';
import {
  REPORT_TYPES,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_LABELS_EN,
  REPORT_TYPE_SHORT,
  RESOLUTION_LABELS,
  isReportType,
  reportTypeShort,
  resolutionLabel,
} from '@/features/vendor-reports/report-kinds';

describe('statusLabel', () => {
  it('maps a backend status code to its Vietnamese label and tone', () => {
    expect(statusLabel('OVERDUE')).toEqual({ label: 'Quá hạn', tone: 'danger' });
    expect(statusLabel('APPROVED')).toEqual({ label: 'Đã duyệt', tone: 'ok' });
    expect(statusLabel('MORE_INFORMATION_REQUIRED')).toEqual({
      label: 'Cần bổ sung',
      tone: 'pending',
    });
  });

  it('shows the raw code in a neutral tone for a status it has not heard of', () => {
    expect(statusLabel('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', tone: 'neutral' });
  });

  it('is case sensitive: backend codes are upper case', () => {
    expect(statusLabel('overdue').label).toBe('overdue');
  });

  it('covers every status the order, fee, permit and registration flows use', () => {
    const used = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'MORE_INFORMATION_REQUIRED',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'PENDING',
      'PAID',
      'OVERDUE',
      'UNPAID',
      'WAIVED',
      'EXPIRED',
      'ACTIVE',
      'SUSPENDED',
      'REVOKED',
      'CANCELLED',
      'PENDING_PAYMENT',
      'PLACED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'REFUND_REQUIRED',
      'REFUNDED',
      'FAILED',
      'FORWARDED',
    ];
    for (const code of used) expect(STATUS_LABELS[code], code).toBeDefined();
  });

  it('gives every label some text and one of the three tones', () => {
    for (const [code, { label, tone }] of Object.entries(STATUS_LABELS)) {
      expect(label.trim(), code).not.toBe('');
      expect(['ok', 'pending', 'danger', 'neutral'], code).toContain(tone);
    }
  });
});

describe('report kinds (BUY-05 / BUY-07)', () => {
  it('has a label, an English label, a short name and an icon for every type', () => {
    for (const type of REPORT_TYPES) {
      expect(REPORT_TYPE_LABELS[type]).toBeTruthy();
      expect(REPORT_TYPE_LABELS_EN[type]).toBeTruthy();
      expect(REPORT_TYPE_SHORT[type]).toBeTruthy();
      expect(REPORT_TYPE_ICONS[type]).toBeTruthy();
    }
  });

  it('recognises only the three real types', () => {
    expect(isReportType('OVERCHARGE')).toBe(true);
    expect(isReportType('PRICE_NOT_POSTED')).toBe(true);
    expect(isReportType('GENERAL')).toBe(true);
    expect(isReportType('overcharge')).toBe(false);
    expect(isReportType('')).toBe(false);
    expect(isReportType(null)).toBe(false);
    expect(isReportType(undefined)).toBe(false);
  });

  it('falls back to "Phản ánh khác" for an unknown or missing type', () => {
    expect(reportTypeShort('OVERCHARGE')).toBe('Bán cao hơn giá niêm yết');
    expect(reportTypeShort('WHATEVER')).toBe('Phản ánh khác');
    expect(reportTypeShort(null)).toBe('Phản ánh khác');
  });

  it('labels how the ward closed a report, and returns null while it is still open', () => {
    expect(resolutionLabel('VIOLATION_RECORDED')).toEqual(RESOLUTION_LABELS.VIOLATION_RECORDED);
    expect(resolutionLabel('MEDIATED')?.tone).toBe('ok');
    expect(resolutionLabel('DISMISSED')?.tone).toBe('neutral');
    expect(resolutionLabel(null)).toBeNull();
    expect(resolutionLabel(undefined)).toBeNull();
    expect(resolutionLabel('')).toBeNull();
    expect(resolutionLabel('UNKNOWN')).toBeNull();
  });
});
