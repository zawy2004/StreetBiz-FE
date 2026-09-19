import { buildStreetLayout, slotFootprint } from '@/features/sidewalk-slots/street-geometry';
import type { SidewalkSlot } from '@/core/api/side-api';

function makeSlot(overrides: Partial<SidewalkSlot> & Pick<SidewalkSlot, 'slotCode' | 'latitude' | 'longitude'>): SidewalkSlot {
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

// The original 6 geocoded points (docs/dev-seed-side.sql before the pilot was
// widened to 20 contiguous slots) -- kept here as a fixture because they are
// the proof of the premise this module exists for: slot_code order does not
// match physical order along the street.
const HISTORICAL_SIX = [
  ['NVL-01', 16.06087, 108.216079],
  ['NVL-02', 16.060849, 108.215668],
  ['NVL-03', 16.060727, 108.215702],
  ['NVL-04', 16.060657, 108.215198],
  ['NVL-05', 16.060585, 108.214678],
  ['NVL-06', 16.060523, 108.214228],
] as const;

// One side of the current pilot: 10 slots on a 4 m-pitch lattice
// (docs/dev-seed-side.sql). Used below to exercise outlier rejection and the
// single-row/no-facing-terrace fallback.
const CURRENT_LATTICE: [string, number, number][] = Array.from({ length: 20 }, (_, i) => [
  `NVL-${String(i + 1).padStart(2, '0')}`,
  16.060523 + i * 0.0000069,
  108.214228 + i * 0.0000367,
]);

describe('buildStreetLayout', () => {
  it('fits the historical six slots into one strip, in physical order (not code order)', () => {
    const slots = HISTORICAL_SIX.map(([code, lat, lng]) => makeSlot({ slotCode: code, latitude: lat, longitude: lng }));
    const layout = buildStreetLayout(slots);

    expect(layout.kind).toBe('strip');
    if (layout.kind !== 'strip') return;

    expect(layout.bearingDegrees).toBeGreaterThan(9);
    expect(layout.bearingDegrees).toBeLessThan(13);
    expect(layout.lengthMeters).toBeGreaterThan(195);
    expect(layout.lengthMeters).toBeLessThan(210);

    const order = layout.placed.map((p) => p.slot.slotCode);
    expect(order[0]).toBe('NVL-06');
    expect(order[order.length - 1]).toBe('NVL-01');
    // The claim this module exists for: physical order != code order.
    expect(order.indexOf('NVL-03')).toBeGreaterThan(order.indexOf('NVL-02'));
  });

  it('produces the same order regardless of input order', () => {
    const slots = HISTORICAL_SIX.map(([code, lat, lng]) => makeSlot({ slotCode: code, latitude: lat, longitude: lng }));
    const shuffled = [slots[3]!, slots[0]!, slots[5]!, slots[1]!, slots[4]!, slots[2]!];

    const a = buildStreetLayout(slots);
    const b = buildStreetLayout(shuffled);
    if (a.kind !== 'strip' || b.kind !== 'strip') throw new Error('expected strip');

    expect(b.placed.map((p) => p.slot.slotCode)).toEqual(a.placed.map((p) => p.slot.slotCode));
  });

  it('breaks direction ties deterministically (a north-south street orders south to north)', () => {
    const column = [
      makeSlot({ slotCode: 'N-01', latitude: 16.0, longitude: 108.0 }),
      makeSlot({ slotCode: 'N-02', latitude: 16.0009, longitude: 108.0 }),
      makeSlot({ slotCode: 'N-03', latitude: 16.0018, longitude: 108.0 }),
    ];
    const layout = buildStreetLayout(column);
    expect(layout.kind).toBe('strip');
    if (layout.kind !== 'strip') return;
    expect(layout.placed.map((p) => p.slot.slotCode)).toEqual(['N-01', 'N-02', 'N-03']);

    // Reversing the input must not flip the drawn order.
    const reversed = buildStreetLayout([...column].reverse());
    if (reversed.kind !== 'strip') throw new Error('expected strip');
    expect(reversed.placed.map((p) => p.slot.slotCode)).toEqual(['N-01', 'N-02', 'N-03']);
  });

  it('rejects a slot kilometres away as an outlier instead of letting it skew the axis', () => {
    const lattice = CURRENT_LATTICE.map(([code, lat, lng]) => makeSlot({ slotCode: code, latitude: lat, longitude: lng }));
    const outlier = makeSlot({ slotCode: 'DEV-SEED-01', latitude: 16.012, longitude: 108.24 });

    const layout = buildStreetLayout([...lattice, outlier]);
    expect(layout.kind).toBe('strip');
    if (layout.kind !== 'strip') return;

    expect(layout.bearingDegrees).toBeGreaterThan(9);
    expect(layout.bearingDegrees).toBeLessThan(13);
    expect(layout.offStreet).toHaveLength(1);
    expect(layout.offStreet[0]!.slotCode).toBe('DEV-SEED-01');
    expect(layout.placed.some((p) => p.slot.slotCode === 'DEV-SEED-01')).toBe(false);
  });

  it('reports a single row of slots as one side, not two', () => {
    const slots = CURRENT_LATTICE.map(([code, lat, lng]) => makeSlot({ slotCode: code, latitude: lat, longitude: lng }));
    const layout = buildStreetLayout(slots);
    expect(layout.kind).toBe('strip');
    if (layout.kind !== 'strip') return;
    expect(layout.hasTwoSides).toBe(false);
  });

  it('does not mistake ~0.5 m real-world jitter around one row for two facing rows', () => {
    // Alternating +/-0.0000045 deg latitude ~= +/-0.5 m -- comfortably under
    // TWO_SIDED_MIN_OFFSET_METERS (5 m), unlike the ~38 m real pilot offset.
    const jittered = CURRENT_LATTICE.map(([code, lat, lng], i) =>
      makeSlot({ slotCode: code, latitude: lat + (i % 2 === 0 ? 0.0000045 : -0.0000045), longitude: lng }),
    );
    const layout = buildStreetLayout(jittered);
    expect(layout.kind).toBe('strip');
    if (layout.kind !== 'strip') return;
    expect(layout.hasTwoSides).toBe(false);
  });

  it('splits two facing rows into side A / side B by which side of the axis they sit on', () => {
    // Two rows ~20 m apart (10 m either side of the axis), 5 slots each at a
    // 20 m pitch (80 m along, comfortably over the 0.35 cross/along ratio),
    // facing each other across the roadway -- the shape street-geometry now
    // has to recognise as a real two-sided street, not just a wide single row.
    const rowNorth = Array.from({ length: 5 }, (_, i) =>
      makeSlot({ slotCode: `N-${i}`, latitude: 16.060090, longitude: 108.21 + i * 0.000187 }),
    );
    const rowSouth = Array.from({ length: 5 }, (_, i) =>
      makeSlot({ slotCode: `S-${i}`, latitude: 16.059910, longitude: 108.21 + i * 0.000187 }),
    );

    const layout = buildStreetLayout([...rowNorth, ...rowSouth]);
    expect(layout.kind).toBe('strip');
    if (layout.kind !== 'strip') return;

    expect(layout.hasTwoSides).toBe(true);
    const bySide = { A: layout.placed.filter((p) => p.side === 'A'), B: layout.placed.filter((p) => p.side === 'B') };
    expect(bySide.A).toHaveLength(5);
    expect(bySide.B).toHaveLength(5);
    for (const p of layout.placed) {
      expect(p.side).toBe(p.crossMeters >= 0 ? 'A' : 'B');
      expect(Math.abs(p.crossMeters)).toBeGreaterThan(8);
      expect(Math.abs(p.crossMeters)).toBeLessThan(12);
    }
    // Every N-* slot lands on the same side as every other N-* slot (and
    // likewise for S-*) -- the two rows don't get mixed together.
    const sideOf = (code: string) => layout.placed.find((p) => p.slot.slotCode === code)!.side;
    expect(new Set(rowNorth.map((s) => sideOf(s.slotCode))).size).toBe(1);
    expect(new Set(rowSouth.map((s) => sideOf(s.slotCode))).size).toBe(1);
    expect(sideOf('N-0')).not.toBe(sideOf('S-0'));
  });

  it('handles empty, single-slot, coincident, and 2D-cluster inputs', () => {
    expect(buildStreetLayout([])).toEqual({ kind: 'empty' });

    const single = buildStreetLayout([makeSlot({ slotCode: 'A', latitude: 16.06, longitude: 108.21 })]);
    expect(single.kind).toBe('strip');
    if (single.kind === 'strip') expect(single.placed).toHaveLength(1);

    const coincident = buildStreetLayout(
      Array.from({ length: 4 }, (_, i) => makeSlot({ slotCode: `C-${i}`, latitude: 16.06, longitude: 108.21 })),
    );
    expect(coincident.kind).toBe('not-a-street');

    // A 60x60 m 2D cluster, not a line.
    const cluster = buildStreetLayout([
      makeSlot({ slotCode: 'G-1', latitude: 16.0600, longitude: 108.2100 }),
      makeSlot({ slotCode: 'G-2', latitude: 16.0600, longitude: 108.2106 }),
      makeSlot({ slotCode: 'G-3', latitude: 16.0605, longitude: 108.2100 }),
      makeSlot({ slotCode: 'G-4', latitude: 16.0605, longitude: 108.2106 }),
    ]);
    expect(cluster.kind).toBe('not-a-street');
  });
});

describe('slotFootprint', () => {
  it('computes area from width x length when both are measured', () => {
    const footprint = slotFootprint({ widthMeters: 2, lengthMeters: 3 });
    expect(footprint).toEqual({ alongMeters: 2, acrossMeters: 3, areaSqm: 6, measured: true });
  });

  it('never fabricates a size when either dimension is missing', () => {
    expect(slotFootprint({ widthMeters: null, lengthMeters: 3 }).measured).toBe(false);
    expect(slotFootprint({ widthMeters: 2, lengthMeters: null }).measured).toBe(false);
    expect(slotFootprint({ widthMeters: null, lengthMeters: null }).areaSqm).toBeNull();
  });
});
