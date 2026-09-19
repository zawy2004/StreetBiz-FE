import type { SidewalkSlot, StreetFeature } from '@/core/api/side-api';

export function makeSlot(
  overrides: Partial<SidewalkSlot> & Pick<SidewalkSlot, 'slotCode' | 'latitude' | 'longitude'>,
): SidewalkSlot {
  return {
    slotId: overrides.slotId ?? Math.floor(Math.random() * 1_000_000),
    zoneId: 1,
    zoneName: 'Đường Nguyễn Văn Linh',
    wardUnitId: 1,
    widthMeters: 2,
    lengthMeters: 3,
    slotStatus: 'AVAILABLE',
    source: 'WARD_DEFINED',
    pricePerDay: 30000,
    availableFrom: null,
    availableTo: null,
    distanceMeters: null,
    imageUrl: null,
    hasPower: false,
    hasWater: false,
    hasTrashBin: false,
    businessCategory: null,
    tenantName: null,
    holdExpiresAt: null,
    ...overrides,
  };
}

// The two facing rows of the Nguyễn Văn Linh pilot (docs/dev-seed-side.sql):
// NVL-01..10 on the north kerb at a 15 m pitch, NVL-11..20 the same lattice 38 m
// south, across the roadway.
export const NVL_COORDINATES: [string, number, number][] = [
  ['NVL-01', 16.060429, 108.213724],
  ['NVL-02', 16.060455, 108.213861],
  ['NVL-03', 16.06048, 108.213999],
  ['NVL-04', 16.060506, 108.214137],
  ['NVL-05', 16.060532, 108.214274],
  ['NVL-06', 16.060558, 108.214412],
  ['NVL-07', 16.060584, 108.21455],
  ['NVL-08', 16.06061, 108.214687],
  ['NVL-09', 16.060636, 108.214825],
  ['NVL-10', 16.060661, 108.214963],
  ['NVL-11', 16.060091, 108.213791],
  ['NVL-12', 16.060117, 108.213929],
  ['NVL-13', 16.060143, 108.214067],
  ['NVL-14', 16.060169, 108.214204],
  ['NVL-15', 16.060195, 108.214342],
  ['NVL-16', 16.060221, 108.21448],
  ['NVL-17', 16.060246, 108.214617],
  ['NVL-18', 16.060272, 108.214755],
  ['NVL-19', 16.060298, 108.214893],
  ['NVL-20', 16.060324, 108.21503],
];

export function nvlSlots(overrides: Partial<SidewalkSlot> = {}): SidewalkSlot[] {
  return NVL_COORDINATES.map(([slotCode, latitude, longitude], i) =>
    makeSlot({ slotId: 10_002 + i, slotCode, latitude, longitude, ...overrides }),
  );
}

export function makeFeature(
  overrides: Partial<StreetFeature> & Pick<StreetFeature, 'featureId' | 'latitude' | 'longitude'>,
): StreetFeature {
  return {
    featureType: 'TREE',
    label: 'Cây xanh',
    blocksBusiness: false,
    note: null,
    ...overrides,
  };
}
