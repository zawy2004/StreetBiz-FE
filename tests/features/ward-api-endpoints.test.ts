import { beforeEach, describe, expect, it, vi } from 'vitest';

// WARD-04..19 client: every ward call goes to the endpoint and body the backend validates.
const api = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiGetBlob: vi.fn(),
  apiUpload: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, ...api };
});

const {
  complianceApi,
  evidenceLabel,
  isOpenRegistration,
  parsePoint,
  statusLabel,
  wardApi,
} = await import('@/features/ward-administration/ward-api');

beforeEach(() => {
  vi.resetAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue({});
});

function call(mock: (typeof api)[keyof typeof api]) {
  const [url, body, config] = mock.mock.calls[0] as [string, unknown?, unknown?];
  return { url, body, config };
}

describe('wardApi slot cases', () => {
  const record = { id: 'P-1', kind: 'proposals', status: 'PENDING' } as never;

  it.each([
    ['me', () => wardApi.me(), '/ward/me'],
    ['list', () => wardApi.list('transfers', 2), '/ward/cases/transfers?page=2'],
    ['get escapes the id', () => wardApi.get('conflicts', 'A/1'), '/ward/cases/conflicts/A%2F1'],
    ['search escapes the address', () => wardApi.search('12 Bạch Đằng & 3'), `/ward/geo/search?address=${encodeURIComponent('12 Bạch Đằng & 3')}`],
    ['proposalAssessment', () => wardApi.proposalAssessment('P-1'), '/ward/cases/proposals/P-1/ai-assessment'],
  ])('%s', async (_name, run, url) => {
    await run();
    expect(call(api.apiGet).url).toBe(url);
  });

  it('a decision carries the status the officer saw, for the stale-status check', async () => {
    await wardApi.decide(record, 'APPROVE', 'Đủ điều kiện');

    expect(call(api.apiPost)).toMatchObject({
      url: '/ward/cases/proposals/P-1/decision',
      body: { decision: 'APPROVE', reason: 'Đủ điều kiện', expectedStatus: 'PENDING' },
    });
  });

  it('verifies a point, pins a proposal and asks for a fresh AI assessment', async () => {
    const point = { latitude: 16.06, longitude: 108.22 };
    await wardApi.verify(point);
    await wardApi.pin('P-1', point);
    await wardApi.runProposalAssessment('P-1');

    expect(api.apiPost.mock.calls[0]).toEqual(['/ward/geo/verify', point]);
    expect(api.apiPut.mock.calls[0]).toEqual(['/ward/cases/proposals/P-1/location', point]);
    expect(api.apiPost.mock.calls[1]).toEqual(['/ward/cases/proposals/P-1/ai-assessment', {}]);
  });

  it('opens an evidence file as an object URL fetched with the bearer token', async () => {
    const blob = new Blob(['x']);
    api.apiGetBlob.mockResolvedValue(blob);
    const createObjectURL = vi.fn(() => 'blob:evidence');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL }));

    await expect(wardApi.document('/api/uploads/evidence/2/abc.jpg')).resolves.toBe('blob:evidence');

    expect(call(api.apiGetBlob).url).toBe('/uploads/evidence/2/abc.jpg');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    vi.unstubAllGlobals();
  });
});

describe('complianceApi', () => {
  it.each([
    ['listEnrollments with a status', () => complianceApi.listEnrollments('SUBMITTED', 2), '/ward/enrollments?status=SUBMITTED&page=2'],
    ['listEnrollments without one', () => complianceApi.listEnrollments(), '/ward/enrollments?page=1'],
    ['getEnrollment', () => complianceApi.getEnrollment('5'), '/ward/enrollments/5'],
    ['listRentalApplications', () => complianceApi.listRentalApplications('SUBMITTED'), '/ward/rental-applications?status=SUBMITTED&page=1'],
    ['getRentalApplication', () => complianceApi.getRentalApplication('8'), '/ward/rental-applications/8'],
    ['listRenewals', () => complianceApi.listRenewals(undefined, 3), '/ward/renewals?page=3'],
    ['getRenewal', () => complianceApi.getRenewal('4'), '/ward/renewals/4'],
    ['listPenaltySchedules today', () => complianceApi.listPenaltySchedules(), '/ward/penalty-schedules'],
    ['listPenaltySchedules on the violation date', () => complianceApi.listPenaltySchedules('2026-10-01'), '/ward/penalty-schedules?asOf=2026-10-01'],
    ['listViolations', () => complianceApi.listViolations('RECORDED'), '/ward/violations?status=RECORDED&page=1'],
    ['getViolation', () => complianceApi.getViolation(11), '/ward/violations/11'],
    ['riskQueue', () => complianceApi.riskQueue(), '/ward/insights/risk-queue'],
    ['patrolHeatmap', () => complianceApi.patrolHeatmap(), '/ward/insights/patrol-heatmap'],
    ['geofenceDrift', () => complianceApi.geofenceDrift(), '/ward/insights/geofence-drift'],
  ])('GET %s', async (_name, run, url) => {
    await run();
    expect(call(api.apiGet).url).toBe(url);
  });

  it.each([
    ['decideEnrollment', () => complianceApi.decideEnrollment('5', 'MORE_INFO', 'Thiếu CCCD', 'SUBMITTED'), '/ward/enrollments/5/decision', { decision: 'MORE_INFO', reason: 'Thiếu CCCD', expectedStatus: 'SUBMITTED' }],
    ['confirmIdentity', () => complianceApi.confirmIdentity('5', 'Đã đối chiếu CCCD gắn chip'), '/ward/enrollments/5/confirm-identity', { note: 'Đã đối chiếu CCCD gắn chip' }],
    ['decideRentalApplication', () => complianceApi.decideRentalApplication('8', 'APPROVE', 'OK', 'SUBMITTED'), '/ward/rental-applications/8/decision', { decision: 'APPROVE', reason: 'OK', expectedStatus: 'SUBMITTED' }],
    ['decideRenewal', () => complianceApi.decideRenewal('4', 'REJECT', 'Còn nợ phí', 'PENDING'), '/ward/renewals/4/decision', { decision: 'REJECT', reason: 'Còn nợ phí', expectedStatus: 'PENDING' }],
    ['inspectPermit', () => complianceApi.inspectPermit('GP-1', 16, 108, '/p.jpg'), '/ward/permits/inspect', { permitCodeOrPayload: 'GP-1', latitude: 16, longitude: 108, inspectionPhotoUrl: '/p.jpg' }],
    ['permitAction defaults the threshold flag', () => complianceApi.permitAction(3, 'SUSPEND', 'Vi phạm 3 lần'), '/ward/permits/3/action', { action: 'SUSPEND', reason: 'Vi phạm 3 lần', basedOnComplianceThreshold: false }],
    ['recordExplanation', () => complianceApi.recordExplanation(11, 'Tôi sẽ dọn ngay'), '/ward/violations/11/explanation', { content: 'Tôi sẽ dọn ngay' }],
    ['deliverViolation refused', () => complianceApi.deliverViolation(11, null, true, 'Không ký'), '/ward/violations/11/deliver', { deliveredToName: null, refused: true, refusalReason: 'Không ký' }],
    ['aiEncroachmentCheck', () => complianceApi.aiEncroachmentCheck('/api/uploads/evidence/2/a.jpg', 2, 3, 4), '/ward/ai/encroachment-check', { photoUrl: '/api/uploads/evidence/2/a.jpg', slotWidth: 2, slotLength: 3, slotId: 4 }],
    ['aiFeedback', () => complianceApi.aiFeedback(9, false, 'Sai tên'), '/ward/ai/suggestions/9/feedback', { accepted: false, note: 'Sai tên' }],
  ])('POST %s', async (_name, run, url, body) => {
    await run();
    expect(call(api.apiPost)).toMatchObject({ url, body });
  });

  it('batch renewals send only the id and the status each one was seen in', async () => {
    await complianceApi.batchDecideRenewals(
      [{ renewalId: 1, expectedStatus: 'PENDING', extra: 'x' } as never, { renewalId: 2, expectedStatus: 'PENDING' }],
      'APPROVE',
      'Đủ điều kiện gia hạn',
    );

    expect(call(api.apiPost)).toEqual({
      url: '/ward/renewals/batch-decision',
      body: { items: [{ renewalId: 1, expectedStatus: 'PENDING' }, { renewalId: 2, expectedStatus: 'PENDING' }], decision: 'APPROVE', reason: 'Đủ điều kiện gia hạn' },
      config: undefined,
    });
  });

  it('records a violation raised from a citizen report as given', async () => {
    const request = { slotId: 4, violationType: 'HYGIENE_LITTERING', description: 'Rác', sourceReportId: 12 };

    await complianceApi.recordViolation(request);

    expect(call(api.apiPost)).toMatchObject({ url: '/ward/violations', body: request });
  });

  it('a sanction never sends a signer, and splits an amount override into amount and reason', async () => {
    await complianceApi.sanctionViolation(11, 2, 'QĐ-01', 'ghi chú', true, { amount: 1_500_000, reason: 'Tái phạm' });
    await complianceApi.sanctionViolation(12, 2, 'QĐ-02');

    const [first, second] = api.apiPost.mock.calls as [[string, Record<string, unknown>], [string, Record<string, unknown>]];
    expect(first).toEqual(['/ward/violations/11/sanction', {
      penaltyScheduleId: 2, decisionNumber: 'QĐ-01', notes: 'ghi chú', acknowledgeEarlySanction: true, amountOverride: 1_500_000, amountReason: 'Tái phạm',
    }]);
    expect(second[1]).toMatchObject({ amountOverride: undefined, amountReason: undefined });
    expect(Object.keys(first[1])).not.toContain('signer');
  });

  it('the AI document check sends only the registration id, with a longer timeout', async () => {
    await complianceApi.aiDocumentExtract('5');

    expect(call(api.apiPost)).toEqual({ url: '/ward/ai/document-extract', body: { registrationId: 5 }, config: { timeout: 45_000 } });
  });

  it('downloads the enrollment and violation documents as blobs', async () => {
    await complianceApi.downloadEnrollmentDocument('5', 'pdf');
    await complianceApi.downloadViolationDocument(11);

    expect(api.apiGetBlob.mock.calls.map((c) => c[0])).toEqual(['/ward/enrollments/5/document?format=pdf', '/ward/violations/11/document']);
  });

  it('uploads evidence as a multipart file field', async () => {
    const file = new File(['x'], 'bien-ban.jpg', { type: 'image/jpeg' });

    await complianceApi.uploadEvidence(file);

    const [url, form] = api.apiUpload.mock.calls[0] as [string, FormData];
    expect(url).toBe('/uploads/evidence');
    expect(form.get('file')).toBeInstanceOf(File);
  });
});

describe('ward helpers', () => {
  it.each([
    ['16.06', '108.22', { latitude: 16.06, longitude: 108.22 }],
    ['', '108', null],
    ['  ', '108', null],
    ['abc', '108', null],
    ['91', '108', null],
    ['16', '-181', null],
    ['-90', '180', { latitude: -90, longitude: 180 }],
  ])('parsePoint(%s, %s)', (lat, lng, expected) => {
    expect(parsePoint(lat, lng)).toEqual(expected);
  });

  it('labels UNDER_REVIEW by case kind and falls back to the raw status', () => {
    expect(statusLabel('conflicts', 'UNDER_REVIEW')).toBe('Đang xếp hàng');
    expect(statusLabel('proposals', 'UNDER_REVIEW')).toBe('Đang xét duyệt');
    expect(statusLabel('transfers', 'SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it('only the three waiting statuses count as open registrations', () => {
    expect(['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'DRAFT'].map((status) => isOpenRegistration({ status })))
      .toEqual([true, true, true, false, false]);
  });

  it('names a document by its type, a readable label, or a generic fallback', () => {
    expect(evidenceLabel({ type: 'IDENTITY_DOCUMENT_BACK', label: 'IDENTITY_DOCUMENT_BACK' })).toBe('CCCD mặt sau');
    expect(evidenceLabel({ type: 'FOOD_SAFETY', label: 'Giấy ATTP' })).toBe('Giấy ATTP');
    expect(evidenceLabel({ type: 'FOOD_SAFETY', label: 'FOOD_SAFETY' })).toBe('Giấy tờ khác');
    expect(evidenceLabel({ type: 'FOOD_SAFETY' })).toBe('Giấy tờ khác');
  });
});
