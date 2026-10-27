import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  ...client,
}));

const { taxApi, wardTaxApi } = await import('@/core/api/tax-api');
const format = await import('@/features/tax/tax-format');

describe('household tax API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the household overview, ledger, profile and declarations', async () => {
    await taxApi.overview(2026);
    await taxApi.overview();
    await taxApi.ledger(2026, 10);
    await taxApi.profile();
    await taxApi.declarations(2026);

    expect(client.apiGet.mock.calls.map((call) => call[0])).toEqual([
      '/vendor/tax/overview?year=2026',
      '/vendor/tax/overview',
      '/vendor/tax/ledger?year=2026&month=10',
      '/vendor/tax/profile',
      '/vendor/tax/declarations?year=2026',
    ]);
  });

  it('records and voids revenue entries', async () => {
    const request = { date: '2026-10-18', amount: 2_500_000, channel: 'CASH' as const, note: null };
    await taxApi.addEntry(request);
    await taxApi.voidEntry(5, 'Nhập nhầm');
    await taxApi.voidEntry(6, null);

    expect(client.apiPost.mock.calls).toEqual([
      ['/vendor/tax/revenue-entries', request],
      ['/vendor/tax/revenue-entries/5/void', { reason: 'Nhập nhầm' }],
      ['/vendor/tax/revenue-entries/6/void', { reason: null }],
    ]);
  });

  it('asks for an estimate with only the parameters that were given', async () => {
    await taxApi.estimate({ year: 2026, basis: 'PROJECTED' });
    await taxApi.estimate({ year: 2026, revenue: 1_200_000_000, costRatio: 0.6 });

    expect(client.apiGet.mock.calls.map((call) => call[0])).toEqual([
      '/vendor/tax/estimate?year=2026&basis=PROJECTED',
      '/vendor/tax/estimate?year=2026&revenue=1200000000&costRatio=0.6',
    ]);
  });

  it('confirms and retracts a filing on the period route', async () => {
    const request = {
      revenueDeclared: 850_000_000,
      filedOn: '2027-01-20',
      authorityReference: 'BN-1',
      receiptUrl: null,
      note: null,
    };
    await taxApi.confirmFiling(2026, 'YEAR', 0, request);
    await taxApi.confirmFiling(2026, 'QUARTER', 3, request);
    await taxApi.retractFiling(2026, 'QUARTER', 3);

    expect(client.apiPut.mock.calls).toEqual([
      ['/vendor/tax/declarations/2026/year/0', request],
      ['/vendor/tax/declarations/2026/quarter/3', request],
    ]);
    expect(client.apiDelete).toHaveBeenCalledWith('/vendor/tax/declarations/2026/quarter/3');
  });

  it('saves the profile with the revenue-sharing choice', async () => {
    const request = {
      taxCode: '0123456789',
      industryCode: 'FOOD_SERVICE',
      eInvoiceRegistered: false,
      shareRevenueWithWard: true,
    };
    await taxApi.updateProfile(request);
    expect(client.apiPut).toHaveBeenCalledWith('/vendor/tax/profile', request);
  });

  it('downloads the revenue book and the summary for a year', async () => {
    await taxApi.exportRevenueBook(2026);
    await taxApi.exportSummary(2026);
    expect(client.apiGetBlob.mock.calls.map((call) => call[0])).toEqual([
      '/vendor/tax/revenue-book/export?year=2026',
      '/vendor/tax/summary/export?year=2026',
    ]);
  });
});

describe('ward tax API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the dashboard, households and referrals', async () => {
    await wardTaxApi.dashboard();
    await wardTaxApi.households(2026);
    await wardTaxApi.referrals('PENDING');
    await wardTaxApi.referrals();
    await wardTaxApi.announcements();

    expect(client.apiGet.mock.calls.map((call) => call[0])).toEqual([
      '/ward/tax/dashboard',
      '/ward/tax/households?year=2026',
      '/ward/tax/referrals?status=PENDING',
      '/ward/tax/referrals',
      '/ward/tax/announcements',
    ]);
  });

  it('handles a referral and sends an announcement', async () => {
    await wardTaxApi.refreshReferrals();
    await wardTaxApi.reportReferral(7, 'CV-12', null);
    await wardTaxApi.dismissReferral(8, 'Hộ đã ngừng');
    await wardTaxApi.sendAnnouncement({ segment: 'NOT_FILED', taxYear: 2026, title: 'Nhắc', body: 'Nội dung' });

    expect(client.apiPost.mock.calls).toEqual([
      ['/ward/tax/referrals/refresh'],
      ['/ward/tax/referrals/7/report', { reference: 'CV-12', note: null }],
      ['/ward/tax/referrals/8/dismiss', { reason: 'Hộ đã ngừng' }],
      ['/ward/tax/announcements', { segment: 'NOT_FILED', taxYear: 2026, title: 'Nhắc', body: 'Nội dung' }],
    ]);
  });

  it('downloads the ward workbook', async () => {
    await wardTaxApi.exportWorkbook(2026);
    expect(client.apiGetBlob).toHaveBeenCalledWith('/ward/tax/export?year=2026');
  });
});

describe('tax formatting', () => {
  it('writes money compactly in Vietnamese units', () => {
    expect(format.formatCompactVnd(1_000_000_000)).toBe('1 tỷ');
    expect(format.formatCompactVnd(1_500_000_000)).toBe('1,5 tỷ');
    expect(format.formatCompactVnd(500_000_000)).toBe('500 triệu');
    expect(format.formatCompactVnd(2_500_000)).toBe('2,5 triệu');
    expect(format.formatCompactVnd(90_000)).toBe('90.000 đ');
  });

  it('groups typed digits and reads them back', () => {
    expect(format.groupDigits('2500000')).toBe('2.500.000');
    expect(format.groupDigits('a1b2.3')).toBe('123');
    expect(format.groupDigits('0012')).toBe('12');
    expect(format.groupDigits('')).toBe('');
    expect(format.parseDigits('2.500.000 đ')).toBe(2_500_000);
    expect(format.parseDigits('')).toBe(0);
  });

  it('shows plain dates without any timezone shift', () => {
    expect(format.formatDay('2026-10-18')).toBe('18/10/2026');
    expect(format.formatDay('2026-10-18T23:30:00')).toBe('18/10/2026');
    expect(format.formatDayShort('2026-01-05')).toBe('05/01');
  });

  it('turns a ratio into a percent', () => {
    expect(format.formatPercent(0.015)).toBe('1,5%');
    expect(format.formatPercent(0.2, 0)).toBe('20%');
  });

  it('offers tax years from the first rule year to this one, newest first', () => {
    expect(format.taxYears(new Date('2026-10-18T00:00:00Z'))).toEqual([2026]);
    expect(format.taxYears(new Date('2028-02-01T00:00:00Z'))).toEqual([2028, 2027, 2026]);
    expect(format.currentTaxYear(new Date('2025-06-01T00:00:00Z'))).toBe(2026);
  });

  it('accepts tax codes of 10, 12, 13 or 14 digits and the empty code', () => {
    expect(format.validTaxCode('')).toBe(true);
    expect(format.validTaxCode('0123456789')).toBe(true);
    expect(format.validTaxCode('048090001234')).toBe(true);
    expect(format.validTaxCode('0123456789-001')).toBe(true);
    expect(format.validTaxCode('0123456789 001')).toBe(true);
    expect(format.validTaxCode('12345')).toBe(false);
    expect(format.validTaxCode('01234567891')).toBe(false);
    expect(format.validTaxCode('01234abc89')).toBe(false);
  });

  it('labels every group, level, period status and referral status', () => {
    expect(Object.keys(format.GROUP_LABEL)).toEqual(['G1', 'G2', 'G3', 'G4']);
    expect(format.LEVEL_TONE).toEqual({ SAFE: 'ok', NEAR: 'pending', OVER: 'danger' });
    expect(format.PERIOD_STATUS_LABEL.OVERDUE).toBe('Quá hạn');
    expect(format.PERIOD_STATUS_TONE.FILED).toBe('ok');
    expect(format.REFERRAL_STATUS_LABEL.PENDING).toBe('Chờ xử lý');
    expect(format.CHANNEL_OPTIONS.map((option) => option.value)).toEqual(['CASH', 'BANK_TRANSFER', 'EWALLET', 'OTHER']);
  });
});
