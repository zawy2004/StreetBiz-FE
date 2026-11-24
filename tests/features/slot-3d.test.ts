import { describe, expect, it } from 'vitest';

import {
  bearingGap,
  bearingLabel,
  bearingTowards,
  easeInOut,
  effectiveBearing,
  fitStreetBearing,
  flightDurationMs,
  foldBearing,
  offsetMeters,
  slotRing,
  snapBearing,
  streetSpan,
  toLocalMeters,
  zoneStreetBearings,
  type GeoPoint,
} from '@/features/sidewalk-slots/slot-3d';
import {
  HEAT_WEIGHTS,
  obstacleBlocks,
  occupancyHeat,
  OPENFREEMAP_GLYPHS,
  OPENFREEMAP_TILES,
  roadWidth,
  ROAD_METRES,
  SCENE_SELECTED_COLOR,
  SCENE_SLOT_COLORS,
  SCENE_SLOT_HEIGHTS,
  sceneStyle,
  SIDEWALK_METRES,
  slotBlocks,
  slotPins,
  type SceneSlot,
} from '@/features/sidewalk-slots/slot-scene';
import { overviewBearing } from '@/features/sidewalk-slots/useSceneCamera';

const ORIGIN: GeoPoint = { latitude: 16.0607, longitude: 108.2155 };

/** Points `step` metres apart along a compass bearing, starting at ORIGIN. */
function line(count: number, bearing: number, step = 3): GeoPoint[] {
  const t = (bearing * Math.PI) / 180;
  return Array.from({ length: count }, (_, i) => {
    const [longitude, latitude] = offsetMeters(
      ORIGIN,
      Math.sin(t) * step * i,
      Math.cos(t) * step * i,
    );
    return { latitude, longitude };
  });
}

const dist = (a: [number, number], b: [number, number]) => {
  const p = toLocalMeters({ longitude: b[0], latitude: b[1] }, { longitude: a[0], latitude: a[1] });
  return Math.hypot(p.x, p.y);
};

describe('slot orientation', () => {
  it('folds any bearing into half a circle, to two decimals', () => {
    expect(foldBearing(0)).toBe(0);
    expect(foldBearing(180)).toBe(0);
    expect(foldBearing(270)).toBe(90);
    expect(foldBearing(-30)).toBe(150);
    expect(foldBearing(359.999)).toBe(0);
    expect(foldBearing(12.345)).toBe(12.35);
  });

  it('measures how far apart two orientations are, never more than 90 degrees', () => {
    expect(bearingGap(10, 170)).toBe(20);
    expect(bearingGap(0, 90)).toBe(90);
    expect(bearingGap(45, 225)).toBe(0);
  });

  it('snaps a hand-turned bearing to whole degrees, and onto the street when close', () => {
    expect(snapBearing(33.6, null)).toBe(34);
    expect(snapBearing(87, 90)).toBe(90);
    expect(snapBearing(84, 90)).toBe(84);
    expect(snapBearing(178.7, 1)).toBe(1);
  });

  it('reads the bearing from a slot towards a point, or nothing when they coincide', () => {
    const [lng, lat] = offsetMeters(ORIGIN, 5, 0);
    expect(bearingTowards(ORIGIN, { latitude: lat, longitude: lng })).toBeCloseTo(90, 1);
    const [lng2, lat2] = offsetMeters(ORIGIN, -3, -3);
    expect(bearingTowards(ORIGIN, { latitude: lat2, longitude: lng2 })).toBeCloseTo(45, 1);
    expect(bearingTowards(ORIGIN, ORIGIN)).toBeNull();
  });

  it('names the bearing the way an officer says a street runs', () => {
    expect(bearingLabel(0)).toBe('0° · Bắc – Nam');
    expect(bearingLabel(90)).toBe('90° · Đông – Tây');
    expect(bearingLabel(45.5)).toBe('45,5° · Đông Bắc – Tây Nam');
    expect(bearingLabel(135)).toBe('135° · Tây Bắc – Đông Nam');
  });
});

describe('slot footprint', () => {
  it('draws the slot length along its bearing and width across it, closed', () => {
    const ring = slotRing({ ...ORIGIN, widthMeters: 1.5, lengthMeters: 3 }, 90);

    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    expect(dist(ring[0]!, ring[1]!)).toBeCloseTo(3, 2);
    expect(dist(ring[1]!, ring[2]!)).toBeCloseTo(1.5, 2);
    // Bearing 90: the length side runs east-west, so its two ends share a latitude.
    expect(ring[0]![1]).toBeCloseTo(ring[1]![1], 9);
  });

  it('draws an unmeasured slot as the usual 2 m x 1.5 m pitch', () => {
    const ring = slotRing({ ...ORIGIN, widthMeters: null, lengthMeters: null }, 0);
    expect(dist(ring[0]!, ring[1]!)).toBeCloseTo(2, 2);
    expect(dist(ring[1]!, ring[2]!)).toBeCloseTo(1.5, 2);
  });
});

describe('street fitting', () => {
  it('finds the bearing of a row of slots, whatever way it runs', () => {
    expect(fitStreetBearing(line(5, 90))).toBeCloseTo(90, 1);
    expect(fitStreetBearing(line(5, 0))).toBeCloseTo(0, 1);
    expect(fitStreetBearing(line(5, 30))).toBeCloseTo(30, 1);
    expect(fitStreetBearing(line(5, 150))).toBeCloseTo(150, 1);
  });

  it('reads a short street with slots on both sides (Hoàng Diệu: 40 m long, 12 m across)', () => {
    const at = (east: number, north: number) => {
      const [longitude, latitude] = offsetMeters(ORIGIN, east, north);
      return { latitude, longitude };
    };
    expect(fitStreetBearing([at(-6, 0), at(6, 20), at(-6, 40)])).toBeCloseTo(0, 0);
  });

  it('ignores a stray slot kilometres away when fitting the street', () => {
    const [longitude, latitude] = offsetMeters(ORIGIN, 0, 3000);
    expect(fitStreetBearing([...line(6, 90), { latitude, longitude }])).toBeCloseTo(90, 1);
  });

  it('reads no street from one slot, a tight cluster or a square', () => {
    expect(fitStreetBearing([ORIGIN])).toBeNull();
    expect(fitStreetBearing(line(3, 90, 0.5))).toBeNull();
    const corner = (east: number, north: number) => {
      const [longitude, latitude] = offsetMeters(ORIGIN, east, north);
      return { latitude, longitude };
    };
    const square = [corner(0, 0), corner(10, 0), corner(0, 10), corner(10, 10)];
    expect(fitStreetBearing(square)).toBeNull();
  });

  it('fits each zone on its own and falls back to a bearing the ward set', () => {
    const east = line(4, 90).map((p, i) => ({
      ...p,
      zoneId: 1,
      slotId: i,
      widthMeters: 2,
      lengthMeters: 2,
    }));
    const lone = { ...ORIGIN, zoneId: 2, widthMeters: 2, lengthMeters: 2, bearingDegrees: 200 };
    const nothing = { ...ORIGIN, zoneId: 3, widthMeters: 2, lengthMeters: 2 };
    const bearings = zoneStreetBearings([...east, lone, nothing]);

    expect(bearings.get(1)).toBeCloseTo(90, 1);
    expect(bearings.get(2)).toBe(20);
    expect(bearings.has(3)).toBe(false);
  });

  it("draws a slot at its own bearing, else its street's, else north-south", () => {
    const slot = { ...ORIGIN, widthMeters: 2, lengthMeters: 2 };
    expect(effectiveBearing({ ...slot, bearingDegrees: 190 }, 90)).toBe(10);
    expect(effectiveBearing(slot, 90)).toBe(90);
    expect(effectiveBearing(slot, null)).toBe(0);
  });
});

describe('camera', () => {
  it('spans the street from the first slot to the last, with a margin', () => {
    const span = streetSpan(line(5, 90, 3), 90, 6)!;
    expect(span.lengthMeters).toBeCloseTo(12 + 12, 1);
    expect(span.end.longitude).toBeGreaterThan(span.start.longitude);
    expect(streetSpan([], 90)).toBeNull();
  });

  it('flies about 2.5 s per 10 m, never shorter than 6 s nor longer than 24 s', () => {
    expect(flightDurationMs(40)).toBe(10_000);
    expect(flightDurationMs(1)).toBe(6_000);
    expect(flightDurationMs(10_000)).toBe(24_000);
  });

  it('eases in and out, starting and ending at rest', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
  });

  it('lays the street across the screen in the overview', () => {
    expect(overviewBearing(0)).toBe(90);
    expect(overviewBearing(120)).toBe(210);
    expect(overviewBearing(null)).toBe(0);
  });
});

const sceneSlot = (over: Partial<SceneSlot>): SceneSlot => ({
  slotId: 1,
  zoneId: 1,
  slotCode: 'NVL-01',
  status: 'AVAILABLE',
  latitude: ORIGIN.latitude,
  longitude: ORIGIN.longitude,
  widthMeters: 1.5,
  lengthMeters: 3,
  bearingDegrees: null,
  ...over,
});

describe('scene data', () => {
  it('raises a rented slot higher than an open one, coloured by status', () => {
    const { features } = slotBlocks(
      [sceneSlot({ slotId: 1, status: 'ACTIVE' }), sceneSlot({ slotId: 2, status: 'AVAILABLE' })],
      new Map(),
    );
    expect(features[0]!.properties.height).toBe(SCENE_SLOT_HEIGHTS.ACTIVE);
    expect(features[1]!.properties.height).toBe(SCENE_SLOT_HEIGHTS.AVAILABLE);
    expect(SCENE_SLOT_HEIGHTS.ACTIVE).toBeGreaterThan(SCENE_SLOT_HEIGHTS.AVAILABLE);
    expect(features[0]!.properties.color).toBe(SCENE_SLOT_COLORS.ACTIVE);
  });

  it('marks the selected and multi-selected slots, a little taller', () => {
    const { features } = slotBlocks(
      [sceneSlot({ slotId: 1 }), sceneSlot({ slotId: 2 }), sceneSlot({ slotId: 3 })],
      new Map(),
      { selectedId: 1, highlightedIds: new Set([3]) },
    );
    expect(features.map((f) => f.properties.selected)).toEqual([true, false, true]);
    expect(features[0]!.properties.color).toBe(SCENE_SELECTED_COLOR);
    expect(features[0]!.properties.height).toBeCloseTo(SCENE_SLOT_HEIGHTS.AVAILABLE + 0.6);
  });

  it('puts one pin per slot, at the draft position of the slot being moved', () => {
    const [lng, lat] = offsetMeters(ORIGIN, 20, 0);
    const pins = slotPins([sceneSlot({ slotId: 1 }), sceneSlot({ slotId: 2, status: 'ACTIVE' })], {
      selectedId: 1,
      draft: { slotId: 1, position: { latitude: lat, longitude: lng } },
    });
    expect(pins.features).toHaveLength(2);
    expect(pins.features[0]!.geometry.coordinates).toEqual([lng, lat]);
    expect(pins.features[0]!.properties).toMatchObject({
      selected: true,
      color: SCENE_SELECTED_COLOR,
    });
    expect(pins.features[1]!.properties).toMatchObject({
      slotCode: 'NVL-01',
      color: SCENE_SLOT_COLORS.ACTIVE,
      selected: false,
    });
  });

  it('draws the slot being moved and turned where the draft puts it', () => {
    const [lng, lat] = offsetMeters(ORIGIN, 20, 0);
    const moved = { latitude: lat, longitude: lng };
    const [block] = slotBlocks([sceneSlot({})], new Map([[1, 0]]), {
      draft: { slotId: 1, position: moved, bearing: 90 },
    }).features;
    const ring = block!.geometry.coordinates[0]!;
    const centre = ring.slice(0, 4).reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);

    expect(centre[0]).toBeCloseTo(moved.longitude, 7);
    expect(ring[0]![1]).toBeCloseTo(ring[1]![1], 9);
  });

  it('follows the street for a slot with no bearing of its own', () => {
    const [block] = slotBlocks([sceneSlot({})], new Map([[1, 90]])).features;
    const ring = block!.geometry.coordinates[0]!;
    expect(ring[0]![1]).toBeCloseTo(ring[1]![1], 9);
  });

  it('draws street features as blocks, red when they forbid business', () => {
    const { features } = obstacleBlocks([
      { featureId: 1, featureType: 'HYDRANT', blocksBusiness: true, ...ORIGIN },
      { featureId: 2, featureType: 'TREE', blocksBusiness: false, ...ORIGIN },
    ]);
    expect(features[0]!.properties).toMatchObject({ color: '#B42318', height: 0.9 });
    expect(features[1]!.properties.height).toBe(6);
  });

  it('heats rented slots most and leaves suspended ones out', () => {
    const heat = occupancyHeat([
      sceneSlot({ slotId: 1, status: 'ACTIVE' }),
      sceneSlot({ slotId: 2, status: 'SUSPENDED' }),
      sceneSlot({ slotId: 3, status: 'AVAILABLE' }),
    ]);
    expect(heat.features.map((f) => f.properties.weight)).toEqual([
      HEAT_WEIGHTS.ACTIVE,
      HEAT_WEIGHTS.AVAILABLE,
    ]);
  });

  it('draws the 3D street view from vector data only, so it stays sharp up close', () => {
    const style = sceneStyle('street', false);
    expect(style.glyphs).toBe(OPENFREEMAP_GLYPHS);
    expect(style.sources['scene-osm'].url).toBe(OPENFREEMAP_TILES);
    expect(Object.keys(style.sources)).toEqual(['scene-osm']);
    expect(style.layers.map((l) => l.id)).toEqual([
      'scene-background',
      'scene-landuse',
      'scene-park',
      'scene-water',
      'scene-sidewalks',
      'scene-road-edges',
      'scene-roads',
      'scene-buildings',
      'scene-street-names',
      'scene-house-numbers',
    ]);
    expect(style.light.intensity).toBeGreaterThan(0);
    expect(sceneStyle('street', true).layers[0]).toMatchObject({
      paint: { 'background-color': '#161B24' },
    });
  });

  it('keeps the satellite photo under the buildings, capped at its last real zoom', () => {
    const satellite = sceneStyle('satellite', false);
    expect(satellite.sources['scene-base']?.tiles[0]).toContain('World_Imagery');
    expect(satellite.sources['scene-base']?.maxzoom).toBe(19);
    expect(satellite.layers[0]!.id).toBe('scene-base');
  });

  it('draws a road as wide as it really is, halved for one carriageway of a divided road', () => {
    // [interpolate, [exponential, 2], [zoom], 12, [*, metres, k12], 22, [*, metres, k22]], with
    // metres = [+, [*, match, case], extra]: ["zoom"] stays the top-level curve's input.
    const curve = roadWidth(8) as unknown[];
    expect(curve.slice(0, 3)).toEqual(['interpolate', ['exponential', 2], ['zoom']]);
    const [, metres, k12] = curve[4] as [string, unknown[], number];
    const [, , k22] = curve[6] as [string, unknown[], number];
    const [, product, extra] = metres as [string, unknown[], number];
    const [, match, oneway] = product as [string, unknown[], unknown[]];
    expect(extra).toBe(8);
    expect(match).toEqual(expect.arrayContaining(['primary', ROAD_METRES.primary]));
    expect(oneway).toEqual(['case', ['==', ['get', 'oneway'], 1], 0.5, 1]);
    // One metre near 16 N is ~0.027 px at z12 and ~27.9 px at z22.
    expect(k12).toBeCloseTo(0.0272, 3);
    expect(k22).toBeCloseTo(27.87, 1);
    expect(SIDEWALK_METRES).toBe(4);
  });
});
