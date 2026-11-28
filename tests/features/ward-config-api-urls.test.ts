import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ list: [] as { verb: string; url: string; body?: unknown }[] }));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  const record = (verb: string) =>
    vi.fn(async (url: string, body?: unknown) => {
      calls.list.push({ verb, url, body });
      return { ok: true };
    });
  return {
    ...actual,
    apiGet: record('GET'),
    apiPost: record('POST'),
    apiPut: record('PUT'),
    apiDelete: record('DELETE'),
  };
});
vi.mock('@/core/api/client', () => ({
  apiUpload: vi.fn(async (url: string, body: FormData) => {
    calls.list.push({ verb: 'UPLOAD', url, body });
    return { fileUrl: 'https://cdn/x.jpg' };
  }),
}));
vi.mock('@/core/utils/shrink-image', () => ({ shrinkImage: async (f: File) => f }));

const { ApiError } = await import('@/core/api');
const { CONFLICT_MESSAGE, errorMessage, isConflict, wardConfigApi } =
  await import('@/features/ward-administration/ward-config-api');

const last = () => calls.list.at(-1)!;
const slot = { slotId: 7, versionToken: 'a+b/=' } as never;
const zone = { zoneId: 3, versionToken: 'v1' } as never;
const feature = { featureId: 9, versionToken: 'f1' } as never;

beforeEach(() => {
  calls.list = [];
});

describe('ward configuration API', () => {
  it('reads and changes penalty rates', async () => {
    await wardConfigApi.penaltyOverview();
    expect(last()).toMatchObject({ verb: 'GET', url: '/ward/penalty-schedules/overview' });
    await wardConfigApi.penaltyHistory('LẤN CHIẾM');
    expect(last().url).toBe(
      `/ward/penalty-schedules/history?violationType=${encodeURIComponent('LẤN CHIẾM')}`,
    );
    await wardConfigApi.setPenaltyRate({ violationType: 'X' } as never);
    expect(last()).toMatchObject({
      verb: 'POST',
      url: '/ward/penalty-schedules',
      body: { violationType: 'X' },
    });
    await wardConfigApi.cancelPenaltyRate(4);
    expect(last()).toMatchObject({ verb: 'DELETE', url: '/ward/penalty-schedules/4' });
  });

  it('manages pricing zones, their impact, history and suggested price', async () => {
    await wardConfigApi.listZones();
    expect(last().url).toBe('/ward/pricing-zones');
    await wardConfigApi.createZone({ zoneName: 'A' } as never);
    expect(last()).toMatchObject({ verb: 'POST', url: '/ward/pricing-zones' });
    await wardConfigApi.updateZone(3, { zoneName: 'B' } as never);
    expect(last()).toMatchObject({ verb: 'PUT', url: '/ward/pricing-zones/3' });
    await wardConfigApi.deleteZone(zone);
    expect(last()).toMatchObject({ verb: 'DELETE', url: '/ward/pricing-zones/3?versionToken=v1' });
    await wardConfigApi.previewZoneImpact(3, 10_000, null, '2026-12-31', [], {
      priceDisplayUnit: 'MONTH',
      pricePerMonth: 300_000,
      quarterDiscountPercent: 5,
    });
    expect(last()).toMatchObject({
      url: '/ward/pricing-zones/3/impact-preview',
      body: {
        pricePerDay: 10_000,
        availableTo: '2026-12-31',
        priceDisplayUnit: 'MONTH',
        pricePerMonth: 300_000,
      },
    });
    await wardConfigApi.zoneHistory(3);
    expect(last().url).toBe('/ward/pricing-zones/3/history');
    await wardConfigApi.priceSuggestion(3);
    expect(last().url).toBe('/ward/pricing-zones/3/price-suggestion');
  });

  it('reads and saves the compliance policy', async () => {
    await wardConfigApi.getCompliancePolicy();
    expect(last()).toMatchObject({ verb: 'GET', url: '/ward/compliance-policy' });
    await wardConfigApi.upsertCompliancePolicy({ violationThresholdCount: 3 } as never);
    expect(last()).toMatchObject({ verb: 'PUT', url: '/ward/compliance-policy' });
  });

  it('manages slots, with the version token escaped', async () => {
    await wardConfigApi.slotGrid();
    expect(last().url).toBe('/ward/slot-grid');
    await wardConfigApi.slotGrid(3);
    expect(last().url).toBe('/ward/slot-grid?zoneId=3');
    await wardConfigApi.checkPlacement({ zoneId: 3 } as never);
    expect(last().url).toBe('/ward/slot-grid/check');
    await wardConfigApi.checkPlacement({ zoneId: 3 } as never, 7);
    expect(last().url).toBe('/ward/slot-grid/check?ignoreSlotId=7');
    await wardConfigApi.createSlot({ slotCode: null } as never);
    expect(last()).toMatchObject({ verb: 'POST', url: '/ward/slot-grid' });
    await wardConfigApi.updateSlot(slot, { slotCode: 'S1' } as never);
    expect(last()).toMatchObject({
      verb: 'PUT',
      url: '/ward/slot-grid/7',
      body: { slotCode: 'S1', versionToken: 'a+b/=' },
    });
    await wardConfigApi.setSlotStatus(slot, 'SUSPENDED', 'sửa đường');
    expect(last()).toMatchObject({
      url: '/ward/slot-grid/7/status',
      body: { status: 'SUSPENDED', reason: 'sửa đường' },
    });
    await wardConfigApi.deleteSlot(slot);
    expect(last().url).toBe(`/ward/slot-grid/7?versionToken=${encodeURIComponent('a+b/=')}`);
    await wardConfigApi.previewBatch({ zoneId: 3 } as never);
    expect(last().url).toBe('/ward/slot-grid/batch-preview');
    await wardConfigApi.createBatch({ zoneId: 3, positions: [] } as never);
    expect(last().url).toBe('/ward/slot-grid/batch');
    await wardConfigApi.slotHistory(7);
    expect(last().url).toBe('/ward/slot-grid/7/history');
  });

  it('uploads a slot photo as a form', async () => {
    const result = await wardConfigApi.uploadSlotImage(
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    );
    expect(result.fileUrl).toBe('https://cdn/x.jpg');
    expect(last().url).toBe('/uploads/slot-images');
    expect((last().body as FormData).get('file')).toBeInstanceOf(File);
  });

  it('manages street features', async () => {
    await wardConfigApi.createFeature({ featureType: 'TREE' } as never);
    expect(last()).toMatchObject({
      verb: 'POST',
      url: '/ward/street-features',
      body: { versionToken: null },
    });
    await wardConfigApi.updateFeature(feature, { featureType: 'TREE' } as never);
    expect(last()).toMatchObject({
      verb: 'PUT',
      url: '/ward/street-features/9',
      body: { versionToken: 'f1' },
    });
    await wardConfigApi.deleteFeature(feature);
    expect(last().url).toBe('/ward/street-features/9?versionToken=f1');
  });
});

describe('ward configuration error messages', () => {
  it('explains a conflict, a field error, a plain error and the unknown', () => {
    const conflict = new ApiError('conflict', 409, 'x');
    expect(isConflict(conflict)).toBe(true);
    expect(errorMessage(conflict)).toBe(CONFLICT_MESSAGE);
    expect(
      errorMessage(
        new ApiError('validation_error', 400, 'chung', { Price: ['Giá phải lớn hơn 0'] }),
      ),
    ).toBe('Giá phải lớn hơn 0');
    expect(errorMessage(new ApiError('domain_rule', 422, 'Không được'))).toBe('Không được');
    expect(errorMessage(new Error('mất mạng'))).toBe('mất mạng');
    expect(errorMessage('?')).toBe('Không thực hiện được thao tác.');
    expect(errorMessage(undefined, 'Lỗi riêng')).toBe('Lỗi riêng');
    expect(isConflict(new Error('x'))).toBe(false);
  });
});
