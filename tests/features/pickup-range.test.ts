import {
  evaluatePickupRange,
  haversineMeters,
  walkingMinutes,
} from '@/features/orders/pickup/pickup-range';
import type { PickupRangeInfo } from '@/features/orders/types/order.types';

// The same stall and the same cases as StreetBiz-BE PickupRangeTests, so the screen and the
// server agree on every boundary.
const STORE = { latitude: 16.06, longitude: 108.214 };
const METERS_PER_DEGREE_LAT = 111_195;
const range: PickupRangeInfo = {
  pickupPoint: { storefrontId: 7, storefrontName: 'Bún chả', address: null, ...STORE },
  enforced: true,
  radiusMeters: 2000,
  accuracyAllowanceMeters: 150,
  maxAccuracyMeters: 1000,
};
const northBy = (meters: number, accuracyMeters = 10) => ({
  latitude: STORE.latitude + meters / METERS_PER_DEGREE_LAT,
  longitude: STORE.longitude,
  accuracyMeters,
});

describe('pickup range (ORD-01, client mirror)', () => {
  it('measures the great-circle distance to the stall', () => {
    expect(haversineMeters(STORE, northBy(1500))).toBeCloseTo(1500, -1);
    expect(evaluatePickupRange(range, northBy(1500))).toMatchObject({ status: 'WITHIN', radiusMeters: 2000 });
  });

  it('refuses beyond the radius', () => {
    expect(evaluatePickupRange(range, northBy(3400)).status).toBe('OUT_OF_RANGE');
  });

  it('credits reported GPS error up to the allowance, and no further', () => {
    expect(evaluatePickupRange(range, northBy(2080, 100)).status).toBe('WITHIN');
    expect(evaluatePickupRange(range, northBy(2080, 5)).status).toBe('OUT_OF_RANGE');
    expect(evaluatePickupRange(range, northBy(2400, 900)).status).toBe('OUT_OF_RANGE');
  });

  it('decides nothing on a position vaguer than the limit', () => {
    expect(evaluatePickupRange(range, northBy(50, 3000))).toMatchObject({
      status: 'INACCURATE',
      accuracyMeters: 3000,
    });
  });

  it('turns distance into an unhurried walk, never under a minute', () => {
    expect(walkingMinutes(650)).toBe(9);
    expect(walkingMinutes(20)).toBe(1);
  });
});
