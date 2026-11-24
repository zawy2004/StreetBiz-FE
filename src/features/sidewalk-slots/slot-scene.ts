/**
 * What the 3D slot maps draw, as plain GeoJSON and a map style: slots as blocks whose height says
 * how taken they are, street features as small blocks, the buildings and house numbers around
 * them, and the occupancy heat. No React and no map library, so it is testable as data.
 */
import {
  effectiveBearing,
  slotRing,
  squareRing,
  type GeoPoint,
  type LngLat,
  type SlotShape,
} from './slot-3d';

type Polygon = { type: 'Polygon'; coordinates: LngLat[][] };
type Point = { type: 'Point'; coordinates: LngLat };
export type SceneFeature<G, P> = { type: 'Feature'; geometry: G; properties: P };
export type SceneCollection<G, P> = { type: 'FeatureCollection'; features: SceneFeature<G, P>[] };

export type SceneSlotStatus = 'AVAILABLE' | 'PENDING_APPLICATION' | 'ACTIVE' | 'SUSPENDED';

export type SceneSlot = SlotShape & {
  slotId: number;
  zoneId: number;
  slotCode: string;
  status: SceneSlotStatus;
};

/** Block colours: the same table as the 2D dots and the legend. */
export const SCENE_SLOT_COLORS: Record<SceneSlotStatus, string> = {
  AVAILABLE: '#0B7F43',
  PENDING_APPLICATION: '#C98A04',
  ACTIVE: '#111C2B',
  SUSPENDED: '#566173',
};

/**
 * Block height in metres: a rented slot stands like a stall, an open one is a painted pad, so a
 * glance down the street shows what is taken. Exaggerated on purpose; it is not a real height.
 */
export const SCENE_SLOT_HEIGHTS: Record<SceneSlotStatus, number> = {
  AVAILABLE: 0.9,
  PENDING_APPLICATION: 1.7,
  ACTIVE: 2.6,
  SUSPENDED: 0.5,
};

export const SCENE_SELECTED_COLOR = '#F25C05';

export type SlotDraft = {
  slotId: number;
  /** Where the slot is being moved to; null keeps its position. */
  position?: GeoPoint | null;
  /** The bearing being tried; null keeps the slot's own. */
  bearing?: number | null;
};

export type SlotBlockProps = {
  slotId: number;
  slotCode: string;
  color: string;
  height: number;
  selected: boolean;
};

/** Each slot as a turned rectangle, with the draft (move/turn in progress) applied to its slot. */
export function slotBlocks(
  slots: readonly SceneSlot[],
  streetBearings: ReadonlyMap<number, number>,
  options: {
    selectedId?: number | null;
    highlightedIds?: ReadonlySet<number>;
    draft?: SlotDraft | null;
  } = {},
): SceneCollection<Polygon, SlotBlockProps> {
  const { selectedId = null, highlightedIds, draft } = options;
  return {
    type: 'FeatureCollection',
    features: slots.map((slot) => {
      const drafting = draft?.slotId === slot.slotId ? draft : null;
      const position = drafting?.position ?? slot;
      const bearing = drafting?.bearing ?? effectiveBearing(slot, streetBearings.get(slot.zoneId));
      const selected = slot.slotId === selectedId || (highlightedIds?.has(slot.slotId) ?? false);
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            slotRing(
              {
                latitude: position.latitude,
                longitude: position.longitude,
                widthMeters: slot.widthMeters,
                lengthMeters: slot.lengthMeters,
              },
              bearing,
            ),
          ],
        },
        properties: {
          slotId: slot.slotId,
          slotCode: slot.slotCode,
          color: selected ? SCENE_SELECTED_COLOR : SCENE_SLOT_COLORS[slot.status],
          height: SCENE_SLOT_HEIGHTS[slot.status] + (selected ? 0.6 : 0),
          selected,
        },
      };
    }),
  };
}

export type SlotPinProps = { slotId: number; slotCode: string; color: string; selected: boolean };

/**
 * One point per slot (at its draft position while it is being moved), for the round pins and the
 * code labels the 3D view draws over the blocks: a 2 m block is a few pixels wide from a street
 * view away, the pin is always the same size.
 */
export function slotPins(
  slots: readonly SceneSlot[],
  options: {
    selectedId?: number | null;
    highlightedIds?: ReadonlySet<number>;
    draft?: SlotDraft | null;
    /** A slot whose code is already shown another way (the preview's own tag): no map label. */
    unlabelledId?: number | null;
  } = {},
): SceneCollection<Point, SlotPinProps> {
  const { selectedId = null, highlightedIds, draft, unlabelledId = null } = options;
  return {
    type: 'FeatureCollection',
    features: slots.map((slot) => {
      const at = (draft?.slotId === slot.slotId ? draft.position : null) ?? slot;
      const selected = slot.slotId === selectedId || (highlightedIds?.has(slot.slotId) ?? false);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [at.longitude, at.latitude] },
        properties: {
          slotId: slot.slotId,
          slotCode: slot.slotId === unlabelledId ? '' : slot.slotCode,
          color: selected ? SCENE_SELECTED_COLOR : SCENE_SLOT_COLORS[slot.status],
          selected,
        },
      };
    }),
  };
}

export type SceneObstacle = GeoPoint & {
  featureId: number;
  featureType: 'TRANSFORMER' | 'HYDRANT' | 'TREE' | 'LIGHT_POLE' | 'BUS_STOP' | 'PARKING';
  blocksBusiness: boolean;
};

/** Footprint side and height (metres) a street feature is drawn with. */
const OBSTACLE_SHAPES: Record<SceneObstacle['featureType'], { size: number; height: number }> = {
  TRANSFORMER: { size: 1.4, height: 2.4 },
  HYDRANT: { size: 0.5, height: 0.9 },
  TREE: { size: 1.4, height: 6 },
  LIGHT_POLE: { size: 0.35, height: 7 },
  BUS_STOP: { size: 2.4, height: 2.6 },
  PARKING: { size: 2.5, height: 0.1 },
};

export type ObstacleBlockProps = { featureId: number; color: string; height: number };

export function obstacleBlocks(
  features: readonly SceneObstacle[],
): SceneCollection<Polygon, ObstacleBlockProps> {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => {
      const shape = OBSTACLE_SHAPES[f.featureType];
      const color = f.blocksBusiness ? '#B42318' : f.featureType === 'TREE' ? '#3F7D3A' : '#C98A04';
      return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [squareRing(f, shape.size)] },
        properties: { featureId: f.featureId, color, height: shape.height },
      };
    }),
  };
}

/** How much a slot adds to the occupancy heat: a rented slot is "hot", an open one barely. */
export const HEAT_WEIGHTS: Record<SceneSlotStatus, number> = {
  ACTIVE: 1,
  PENDING_APPLICATION: 0.7,
  AVAILABLE: 0.15,
  SUSPENDED: 0,
};

export function occupancyHeat(
  slots: readonly SceneSlot[],
): SceneCollection<Point, { weight: number }> {
  return {
    type: 'FeatureCollection',
    features: slots
      .filter((s) => HEAT_WEIGHTS[s.status] > 0)
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
        properties: { weight: HEAT_WEIGHTS[s.status] },
      })),
  };
}

// ---- The base map in 3D -----------------------------------------------------------------------

/**
 * OpenFreeMap: OpenStreetMap vector tiles with no key and no account. Its `building` layer carries
 * each building's height (`render_height`) and its `housenumber` layer the house numbers, which
 * neither Goong nor Esri's raster tiles expose. Used only for the 3D view.
 */
export const OPENFREEMAP_TILES = 'https://tiles.openfreemap.org/planet';
export const OPENFREEMAP_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const SCENE_FONT = ['Noto Sans Regular'];

const esri = (service: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`;

/**
 * Metres to screen pixels at Đà Nẵng's latitude (~16°N): one pixel is 150 480 / 2^zoom metres.
 * Scaling a width along an exponential (base 2) zoom curve keeps it exactly that many metres wide
 * at every zoom, so a road is drawn as wide as it really is and slots stand on its sidewalks.
 */
const M_PER_PX_Z0 = 150_480;
const PX_PER_METRE_Z12 = 2 ** 12 / M_PER_PX_Z0;
const PX_PER_METRE_Z22 = 2 ** 22 / M_PER_PX_Z0;

/**
 * Typical carriageway widths in Đà Nẵng by OSM class (metres); a one-way piece is one half of a
 * divided road. Sidewalks are drawn as a lighter band SIDEWALK_METRES wide on each side.
 */
export const ROAD_METRES: Record<string, number> = {
  motorway: 22,
  trunk: 21,
  primary: 20,
  secondary: 12,
  tertiary: 10,
  minor: 7,
  service: 4,
  track: 3,
  path: 2.5,
};
export const SIDEWALK_METRES = 4;
const ROAD_CLASSES = Object.keys(ROAD_METRES);

/**
 * A road's drawn width in px: its class width (halved when one-way) plus `extraMetres`, as an
 * exponential zoom curve. Mapbox GL only accepts ["zoom"] as the input of a top-level
 * interpolate, so the per-road metres go inside each stop rather than multiplying the curve.
 */
export function roadWidth(extraMetres: number): unknown[] {
  const byClass: unknown[] = ['match', ['get', 'class']];
  for (const cls of ROAD_CLASSES) byClass.push(cls, ROAD_METRES[cls]);
  byClass.push(6);
  const metres = ['+', ['*', byClass, ['case', ['==', ['get', 'oneway'], 1], 0.5, 1]], extraMetres];
  return [
    'interpolate',
    ['exponential', 2],
    ['zoom'],
    12,
    ['*', metres, PX_PER_METRE_Z12],
    22,
    ['*', metres, PX_PER_METRE_Z22],
  ];
}

const SCENE_PALETTE = {
  light: {
    background: '#EEF0F3',
    landuse: '#E6E8EC',
    park: '#D5E6CC',
    water: '#B9D4EA',
    sidewalk: '#FBFBFC',
    road: '#C3C9D2',
    roadEdge: '#AEB5C0',
    building: '#DCDFE5',
    text: '#3A4150',
    halo: 'rgba(255,255,255,0.92)',
  },
  dark: {
    background: '#161B24',
    landuse: '#1B212C',
    park: '#1F3128',
    water: '#132D45',
    sidewalk: '#2A313D',
    road: '#3B4351',
    roadEdge: '#4A5363',
    building: '#4A5260',
    text: '#E6EAF0',
    halo: 'rgba(17,28,43,0.9)',
  },
};

/**
 * The 3D view's style. Street mode is drawn entirely from vector data, so it stays sharp however
 * close the camera gets: land, parks, water, every road at its real width with its sidewalks,
 * OSM buildings raised to their height, street names and house numbers. Satellite mode keeps the
 * Esri photo (real tiles to z19) under the same buildings and labels. A soft light from the
 * south-west gives the blocks shaded sides.
 */
export function sceneStyle(mode: 'street' | 'satellite', isDark: boolean) {
  const satellite = mode === 'satellite';
  const c = isDark ? SCENE_PALETTE.dark : SCENE_PALETTE.light;
  const text = satellite ? '#F4F6F8' : c.text;
  const halo = satellite ? 'rgba(17,28,43,0.85)' : c.halo;
  const roads = [
    'all',
    ['in', ['get', 'class'], ['literal', ROAD_CLASSES]],
    ['!=', ['get', 'brunnel'], 'tunnel'],
  ];
  const roadLine = (id: string, color: string, extraMetres: number) => ({
    id,
    type: 'line',
    source: 'scene-osm',
    'source-layer': 'transportation',
    filter: roads,
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': roadWidth(extraMetres) },
  });

  const ground = satellite
    ? [{ id: 'scene-base', type: 'raster', source: 'scene-base' }]
    : [
        { id: 'scene-background', type: 'background', paint: { 'background-color': c.background } },
        {
          id: 'scene-landuse',
          type: 'fill',
          source: 'scene-osm',
          'source-layer': 'landuse',
          paint: { 'fill-color': c.landuse },
        },
        {
          id: 'scene-park',
          type: 'fill',
          source: 'scene-osm',
          'source-layer': 'landcover',
          filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland', 'wetland']]],
          paint: { 'fill-color': c.park },
        },
        {
          id: 'scene-water',
          type: 'fill',
          source: 'scene-osm',
          'source-layer': 'water',
          paint: { 'fill-color': c.water },
        },
        // Sidewalk band, kerb edge, then the carriageway on top.
        roadLine('scene-sidewalks', c.sidewalk, 2 * SIDEWALK_METRES),
        roadLine('scene-road-edges', c.roadEdge, 0.6),
        roadLine('scene-roads', c.road, 0),
      ];

  return {
    version: 8,
    glyphs: OPENFREEMAP_GLYPHS,
    light: { anchor: 'viewport', color: '#FFFFFF', intensity: 0.32, position: [1.3, 210, 35] },
    sources: {
      ...(satellite
        ? {
            'scene-base': {
              type: 'raster',
              tiles: [esri('World_Imagery')],
              tileSize: 256,
              // Esri has real imagery to z19 here; beyond it serves a "no data" tile.
              maxzoom: 19,
              attribution: 'Tiles &copy; Esri',
            },
          }
        : {}),
      'scene-osm': {
        type: 'vector',
        url: OPENFREEMAP_TILES,
        attribution: '&copy; OpenFreeMap &copy; OpenStreetMap',
      },
    },
    layers: [
      ...ground,
      {
        id: 'scene-buildings',
        type: 'fill-extrusion',
        source: 'scene-osm',
        'source-layer': 'building',
        minzoom: 15,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': satellite ? '#E6E1D8' : c.building,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': satellite ? 0.55 : 0.92,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'scene-street-names',
        type: 'symbol',
        source: 'scene-osm',
        'source-layer': 'transportation_name',
        minzoom: 14,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name'], ''],
          'text-font': SCENE_FONT,
          'text-size': 13,
        },
        paint: { 'text-color': text, 'text-halo-color': halo, 'text-halo-width': 1.6 },
      },
      {
        id: 'scene-house-numbers',
        type: 'symbol',
        source: 'scene-osm',
        'source-layer': 'housenumber',
        minzoom: 17,
        layout: {
          'text-field': ['get', 'housenumber'],
          'text-font': SCENE_FONT,
          'text-size': 12,
          'text-allow-overlap': false,
        },
        paint: { 'text-color': text, 'text-halo-color': halo, 'text-halo-width': 1.4 },
      },
    ],
  };
}
