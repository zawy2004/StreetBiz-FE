/**
 * The geometry behind the 3D slot maps (the ward's grid editor and the vendor's preview): a slot
 * drawn as the rectangle it really is, turned to its street, and the camera path along that street.
 * Pure math, no map library, so every rule here is testable on its own.
 *
 * Orientation convention (the same as the backend's `bearing_degrees`): the compass bearing
 * (0 = north, clockwise) of the slot's LENGTH side, the side that runs along the street. The batch
 * tool lays slots end to end by their length, which is where the convention comes from. A rectangle
 * turned half a circle covers the same ground, so a bearing is kept in [0, 180).
 */

export type LngLat = [longitude: number, latitude: number];

export type GeoPoint = { latitude: number; longitude: number };

export type SlotShape = GeoPoint & {
  widthMeters: number | null;
  lengthMeters: number | null;
  /** null/undefined: not set by the ward; the slot follows its zone's street. */
  bearingDegrees?: number | null;
};

const METERS_PER_DEGREE_LAT = 110_540;
const METERS_PER_DEGREE_LNG_AT_EQUATOR = 111_320;

/** What an unmeasured slot is drawn as: the ward's usual 2 m x 1.5 m pitch. */
export const PLACEHOLDER_LENGTH_METERS = 2;
export const PLACEHOLDER_WIDTH_METERS = 1.5;

/**
 * A fitted "street" must be at least this long and this straight to set a bearing. Slots on both
 * sides of a short street spread across it (road plus two kerbs, ~14 m on a 40 m run), so the
 * cross spread may reach three quarters of the length; a square cluster (about 1) still has none.
 */
const MIN_STREET_SPREAD_METERS = 3;
const MAX_CROSS_TO_ALONG_RATIO = 0.75;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Into [0, 180), to two decimals, as the backend stores it. */
export function foldBearing(bearing: number): number {
  const folded = ((bearing % 180) + 180) % 180;
  const rounded = Math.round(folded * 100) / 100;
  return rounded >= 180 ? 0 : rounded;
}

function metersPerDegreeLng(latitude: number) {
  return METERS_PER_DEGREE_LNG_AT_EQUATOR * Math.cos(toRad(latitude));
}

/** `center` moved `east` and `north` metres (equirectangular: exact enough over a street). */
export function offsetMeters(center: GeoPoint, east: number, north: number): LngLat {
  return [
    center.longitude + east / metersPerDegreeLng(center.latitude),
    center.latitude + north / METERS_PER_DEGREE_LAT,
  ];
}

/** `point` in metres east/north of `origin`. */
export function toLocalMeters(point: GeoPoint, origin: GeoPoint): { x: number; y: number } {
  return {
    x: (point.longitude - origin.longitude) * metersPerDegreeLng(origin.latitude),
    y: (point.latitude - origin.latitude) * METERS_PER_DEGREE_LAT,
  };
}

/** Unit vectors (east, north) along and across a compass bearing. */
function axes(bearing: number) {
  const t = toRad(bearing);
  return {
    along: { x: Math.sin(t), y: Math.cos(t) },
    across: { x: Math.cos(t), y: -Math.sin(t) },
  };
}

/**
 * The slot's footprint as a closed ring (first corner repeated last), length along `bearing`
 * and width across it, centred on the slot's point.
 */
export function slotRing(slot: SlotShape, bearing: number): LngLat[] {
  const halfLength = (slot.lengthMeters ?? PLACEHOLDER_LENGTH_METERS) / 2;
  const halfWidth = (slot.widthMeters ?? PLACEHOLDER_WIDTH_METERS) / 2;
  const { along, across } = axes(bearing);
  const corner = (a: number, c: number) =>
    offsetMeters(slot, along.x * a + across.x * c, along.y * a + across.y * c);
  const first = corner(-halfLength, -halfWidth);
  return [
    first,
    corner(halfLength, -halfWidth),
    corner(halfLength, halfWidth),
    corner(-halfLength, halfWidth),
    first,
  ];
}

/** A square footprint of `sizeMeters` around a point (a street feature drawn as a block). */
export function squareRing(center: GeoPoint, sizeMeters: number, bearing = 0): LngLat[] {
  return slotRing({ ...center, lengthMeters: sizeMeters, widthMeters: sizeMeters }, bearing);
}

/** A slot farther than this from the group's median is not on the group's street. */
const STRAY_RADIUS_METERS = 300;

function centroid(points: readonly GeoPoint[]): GeoPoint {
  return {
    latitude: points.reduce((s, p) => s + p.latitude, 0) / points.length,
    longitude: points.reduce((s, p) => s + p.longitude, 0) / points.length,
  };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/**
 * Drops slots far from the rest (a mis-geocoded slot kilometres away would otherwise swing the
 * fitted street towards it). Below three points there is no "rest" to compare with.
 */
function withoutStrays(points: readonly GeoPoint[]): readonly GeoPoint[] {
  if (points.length < 3) return points;
  const mid = {
    latitude: median(points.map((p) => p.latitude)),
    longitude: median(points.map((p) => p.longitude)),
  };
  const kept = points.filter((p) => {
    const { x, y } = toLocalMeters(p, mid);
    return Math.hypot(x, y) <= STRAY_RADIUS_METERS;
  });
  return kept.length >= 2 ? kept : points;
}

/**
 * The street a set of slots stands along, as a compass bearing: the principal axis of their
 * positions. null when there is no line to read (one slot, a cluster, a square).
 */
export function fitStreetBearing(points: readonly GeoPoint[]): number | null {
  const kept = withoutStrays(points);
  if (kept.length < 2) return null;
  const origin = centroid(kept);
  const local = kept.map((p) => toLocalMeters(p, origin));
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const { x, y } of local) {
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  // Angle of the principal axis above due east (maths convention).
  const phi = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const along = { x: Math.cos(phi), y: Math.sin(phi) };
  const alongs = local.map((p) => p.x * along.x + p.y * along.y);
  const crosses = local.map((p) => -p.x * along.y + p.y * along.x);
  const spread = Math.max(...alongs) - Math.min(...alongs);
  const crossSpread = Math.max(...crosses) - Math.min(...crosses);
  if (spread < MIN_STREET_SPREAD_METERS) return null;
  if (crossSpread / spread > MAX_CROSS_TO_ALONG_RATIO) return null;
  return foldBearing(90 - toDeg(phi));
}

/**
 * Each zone's street bearing, fitted through the zone's slot positions. A zone whose slots do
 * not line up falls back to a bearing the ward has set on one of its slots, if any.
 */
export function zoneStreetBearings<T extends SlotShape & { zoneId: number }>(
  slots: readonly T[],
): Map<number, number> {
  const byZone = new Map<number, T[]>();
  for (const slot of slots) {
    const group = byZone.get(slot.zoneId);
    if (group) group.push(slot);
    else byZone.set(slot.zoneId, [slot]);
  }
  const result = new Map<number, number>();
  for (const [zoneId, group] of byZone) {
    const fitted = fitStreetBearing(group);
    const set = group.find((s) => s.bearingDegrees != null)?.bearingDegrees;
    const bearing = fitted ?? (set != null ? foldBearing(set) : null);
    if (bearing != null) result.set(zoneId, bearing);
  }
  return result;
}

/** The bearing a slot is drawn at: its own, else its street's, else north-south. */
export function effectiveBearing(
  slot: SlotShape,
  streetBearing: number | null | undefined,
): number {
  if (slot.bearingDegrees != null) return foldBearing(slot.bearingDegrees);
  return streetBearing ?? 0;
}

/**
 * The stretch of street a set of slots covers, along `bearing`: from the first slot to the last
 * (plus `marginMeters` at each end), for the camera to travel.
 */
export function streetSpan(
  points: readonly GeoPoint[],
  bearing: number,
  marginMeters = 6,
): { start: GeoPoint; end: GeoPoint; lengthMeters: number } | null {
  if (points.length === 0) return null;
  const origin = {
    latitude: points.reduce((s, p) => s + p.latitude, 0) / points.length,
    longitude: points.reduce((s, p) => s + p.longitude, 0) / points.length,
  };
  const { along } = axes(bearing);
  const alongs = points.map((p) => {
    const m = toLocalMeters(p, origin);
    return m.x * along.x + m.y * along.y;
  });
  const from = Math.min(...alongs) - marginMeters;
  const to = Math.max(...alongs) + marginMeters;
  const at = (a: number): GeoPoint => {
    const [longitude, latitude] = offsetMeters(origin, along.x * a, along.y * a);
    return { latitude, longitude };
  };
  return { start: at(from), end: at(to), lengthMeters: to - from };
}

/** The bearing from `from` towards `to`, folded; null when the two are too close to tell. */
export function bearingTowards(from: GeoPoint, to: GeoPoint): number | null {
  const { x, y } = toLocalMeters(to, from);
  if (Math.hypot(x, y) < 0.2) return null;
  return foldBearing(toDeg(Math.atan2(x, y)));
}

/** How far apart two orientations are, in degrees (0 to 90: a slot has no front or back). */
export function bearingGap(a: number, b: number): number {
  const d = Math.abs(foldBearing(a) - foldBearing(b));
  return Math.min(d, 180 - d);
}

/**
 * A bearing turned by hand, tidied: whole degrees, and pulled onto the street's bearing when it
 * is within `toleranceDegrees` of it, so "along the street" is easy to hit exactly.
 */
export function snapBearing(
  bearing: number,
  streetBearing: number | null | undefined,
  toleranceDegrees = 4,
): number {
  if (streetBearing != null && bearingGap(bearing, streetBearing) <= toleranceDegrees) {
    return foldBearing(streetBearing);
  }
  return foldBearing(Math.round(bearing));
}

/** "35°" with the compass word a ward officer would use for a street running that way. */
export function bearingLabel(bearing: number): string {
  const b = foldBearing(bearing);
  const shown = Number.isInteger(b) ? String(b) : b.toFixed(1).replace('.', ',');
  const word =
    b < 22.5 || b >= 157.5
      ? 'Bắc – Nam'
      : b < 67.5
        ? 'Đông Bắc – Tây Nam'
        : b < 112.5
          ? 'Đông – Tây'
          : 'Tây Bắc – Đông Nam';
  return `${shown}° · ${word}`;
}

/** Linear interpolation between two points, `t` in [0, 1]. */
export function lerpPoint(a: GeoPoint, b: GeoPoint, t: number): GeoPoint {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

/** How long the camera takes to travel a street: about 2.5 s per 10 m, between 6 and 24 s. */
export function flightDurationMs(lengthMeters: number): number {
  return Math.round(Math.min(24_000, Math.max(6_000, lengthMeters * 250)));
}

/** Smooth start and stop for a camera move. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
