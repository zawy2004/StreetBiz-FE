import { buildCorridor } from '@/features/sidewalk-slots/corridor-model';
import { buildStreetLayout } from '@/features/sidewalk-slots/street-geometry';
import { makeFeature, makeSlot, nvlSlots } from './slot-fixtures';

function stripOf(slots: ReturnType<typeof nvlSlots>) {
  const layout = buildStreetLayout(slots);
  if (layout.kind !== 'strip') throw new Error(`expected a strip, got ${layout.kind}`);
  return layout;
}

const codes = (row: ReturnType<typeof buildCorridor>['rowA']) =>
  row.flatMap((item) => (item.kind === 'slot' ? [item.placed.slot.slotCode] : []));

describe('buildCorridor', () => {
  it('puts each facing row of the pilot street in its own row, in order along the street', () => {
    const corridor = buildCorridor(stripOf(nvlSlots()), []);

    expect(corridor.hasTwoSides).toBe(true);
    // Both rows run west to east, so codes ascend within each row.
    expect(codes(corridor.rowA)).toEqual(Array.from({ length: 10 }, (_, i) => `NVL-${String(i + 1).padStart(2, '0')}`));
    expect(codes(corridor.rowB)).toEqual(Array.from({ length: 10 }, (_, i) => `NVL-${String(i + 11)}`));
  });

  it('draws a single row when every slot is on one side', () => {
    const oneSide = nvlSlots().slice(0, 10);

    const corridor = buildCorridor(stripOf(oneSide), []);

    expect(corridor.hasTwoSides).toBe(false);
    expect(corridor.rowA).toHaveLength(10);
    expect(corridor.rowB).toHaveLength(0);
  });

  it('interleaves a street feature between the slots it sits between, on the right side', () => {
    // Midway between NVL-03 and NVL-04 on the north kerb.
    const transformer = makeFeature({
      featureId: 1,
      featureType: 'TRANSFORMER',
      blocksBusiness: true,
      latitude: 16.060493,
      longitude: 108.214068,
    });

    const corridor = buildCorridor(stripOf(nvlSlots()), [transformer]);

    const order = corridor.rowA.map((item) => (item.kind === 'slot' ? item.placed.slot.slotCode : `feature:${item.feature.featureId}`));
    expect(order.slice(2, 5)).toEqual(['NVL-03', 'feature:1', 'NVL-04']);
    expect(corridor.rowB.some((item) => item.kind === 'feature')).toBe(false);
  });

  it('puts a feature on the south kerb into the far row', () => {
    const hydrant = makeFeature({ featureId: 2, featureType: 'HYDRANT', latitude: 16.060208, longitude: 108.214411 });

    const corridor = buildCorridor(stripOf(nvlSlots()), [hydrant]);

    expect(corridor.rowB.some((item) => item.kind === 'feature' && item.feature.featureId === 2)).toBe(true);
    expect(corridor.rowA.some((item) => item.kind === 'feature')).toBe(false);
  });

  it('drops a feature that belongs to some other street', () => {
    const farAway = makeFeature({ featureId: 3, latitude: 16.07, longitude: 108.23 });
    const alongButFarAcross = makeFeature({ featureId: 4, latitude: 16.0611, longitude: 108.2144 });

    const corridor = buildCorridor(stripOf(nvlSlots()), [farAway, alongButFarAcross]);

    expect([...corridor.rowA, ...corridor.rowB].some((item) => item.kind === 'feature')).toBe(false);
  });

  it('keeps every slot of the zone accounted for, and reports the ones off the street', () => {
    const stray = makeSlot({ slotId: 999, slotCode: 'DEV-SEED-01', latitude: 16.12, longitude: 108.3 });

    const corridor = buildCorridor(stripOf([...nvlSlots(), stray]), []);

    expect(corridor.rowA.length + corridor.rowB.length).toBe(20);
    expect(corridor.offStreet.map((s) => s.slotCode)).toEqual(['DEV-SEED-01']);
  });
});

describe('StreetLayout.locate', () => {
  it('places a slot coordinate at its own position along the street and side of the road', () => {
    const layout = stripOf(nvlSlots());
    const nvl06 = layout.placed.find((p) => p.slot.slotCode === 'NVL-06')!;

    const located = layout.locate(nvl06.slot.latitude, nvl06.slot.longitude);

    expect(located.alongMeters).toBeCloseTo(nvl06.centerMeters, 6);
    expect(located.crossMeters).toBeCloseTo(nvl06.crossMeters, 6);
  });
});
