import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Marker, Source, type MapEvent } from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';

import { Icon } from '@/components/common';
import { env } from '@/core/config/env';
import { palette } from '@/theme';
import { DEFAULT_CENTER } from '@/features/sidewalk-slots/map-constants';
import {
  GOONG_MAP_DEFAULT_PROPS,
  GOONG_MARKER_DEFAULT_PROPS,
  useMapBaseLayer,
} from '@/features/sidewalk-slots/components/GoongMapBaseLayers';
import {
  ObstacleBlocks,
  OccupancyHeat,
  SLOT_BLOCK_LAYER,
  SLOT_PIN_LAYER,
  SlotBlocks,
  SlotPins,
} from '@/features/sidewalk-slots/components/SceneLayers';
import { MapRail } from '@/features/sidewalk-slots/components/MapRail';
import {
  bearingTowards,
  effectiveBearing,
  offsetMeters,
  PLACEHOLDER_LENGTH_METERS,
  snapBearing,
} from '@/features/sidewalk-slots/slot-3d';
import {
  obstacleBlocks,
  occupancyHeat,
  sceneStyle,
  slotBlocks,
  slotPins,
  type SlotDraft,
} from '@/features/sidewalk-slots/slot-scene';
import {
  prefersReducedMotion as reducedMotion,
  SCENE_MAP_OPTIONS,
  SCENE_MAX_ZOOM,
  useSceneCamera,
  type SceneViewport,
} from '@/features/sidewalk-slots/useSceneCamera';
import {
  featureTypeLabels,
  slotStatusLabels,
  type BatchCandidate,
  type WardSlot,
  type WardStreetFeature,
} from '../ward-config-api';
import {
  FEATURE_BLOCK_COLOR,
  FEATURE_OTHER_COLOR,
  SLOT_DOT_COLORS,
  SUSPENDED_BAR,
} from './ops/grid/tokens';
import {
  accuracyColor,
  prefersReducedMotion,
  rulerText,
  type RulerInfo,
} from './ops/grid/placement';

export type MapPoint = { latitude: number; longitude: number };

/** Bump `key` to move the view onto `point` (address search, GPS fix); a plain map tap never moves it. */
export type MapFocus = { point: MapPoint; key: number };

export type { SlotDraft };

type Props = {
  slots: WardSlot[];
  features: WardStreetFeature[];
  selectedSlotId: number | null;
  highlightedSlotIds?: ReadonlySet<number>;
  pins: MapPoint[];
  candidates: BatchCandidate[];
  focus?: MapFocus | null;
  /**
   * The officer's own GPS position, drawn as a distinct dot so it is not mistaken for a pin;
   * with `accuracy` (metres) it also gets its error circle, red once the fix is too loose.
   */
  myLocation?: (MapPoint & { accuracy?: number }) | null;
  /** Batch mode's measurement of the two pins, shown as a tape label halfway along them. */
  ruler?: RulerInfo | null;
  /** Each zone's street bearing (see slot-3d.ts), so a slot without its own lies along its street. */
  streetBearings?: ReadonlyMap<number, number>;
  /** The selected slot's unsaved move or turn, drawn in place of its saved footprint. */
  draft?: SlotDraft | null;
  onMapClick: (point: MapPoint) => void;
  onSelectSlot: (slot: WardSlot) => void;
  /** Dragged the selected (editable) slot to a new point. */
  onMoveSlot?: (slot: WardSlot, point: MapPoint) => void;
  /** Turned the selected (editable) slot with its handle. */
  onTurnSlot?: (slot: WardSlot, bearing: number) => void;
};

const NO_BEARINGS: ReadonlyMap<number, number> = new Map();

/** What a tap in 3D can hit: a block or its pin (one constant, not a new list each render). */
const SLOT_TAP_LAYERS = [SLOT_BLOCK_LAYER, SLOT_PIN_LAYER];

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** How long the line between two batch pins takes to run from the first to the second. */
const LINE_RUN_MS = 400;

/** The turn handle sits this far beyond the end of the slot's length side. */
const HANDLE_GAP_METERS = 1.5;

/**
 * Equirectangular approximation of a metre-radius ring around `center` -- good
 * enough for the few-metre-to-few-hundred-metre clearance radii drawn here,
 * without pulling in a geo library just for this one polygon.
 */
function clearanceRingCoords(
  center: MapPoint,
  radiusMeters: number,
  steps = 48,
): [number, number][] {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = metersPerDegLat * Math.cos((center.latitude * Math.PI) / 180);
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([
      center.longitude + (radiusMeters * Math.cos(angle)) / metersPerDegLng,
      center.latitude + (radiusMeters * Math.sin(angle)) / metersPerDegLat,
    ]);
  }
  return coords;
}

type DragEvent = { lngLat: [number, number] };
const pointOf = (event: DragEvent): MapPoint => ({
  latitude: round(event.lngLat[1]),
  longitude: round(event.lngLat[0]),
});

/**
 * A coloured marker (round for a slot, a diamond for a street feature) with a
 * white rim so it holds 3:1 on the light street tiles and on imagery. Swallows
 * its click so tapping it doesn't also drop a pin on the map underneath.
 */
function Dot({
  latitude,
  longitude,
  size,
  color,
  ring,
  title,
  shape = 'dot',
  barred,
  beacon,
  drop,
  onSelect,
  onDragEnd,
}: {
  latitude: number;
  longitude: number;
  size: number;
  color: string;
  /** Outer halo colour, used to mark a multi-selected slot or the officer's own position. */
  ring?: string;
  title?: string;
  shape?: 'dot' | 'diamond';
  /** White diagonal bar (a suspended slot), so it is not told apart by grey alone. */
  barred?: boolean;
  /** One glowing pulse around the selected slot. */
  beacon?: boolean;
  /** Fall the last 8px into place when it appears (a fresh draft pin). */
  drop?: boolean;
  onSelect?: () => void;
  /** Makes the marker draggable; called with where it was let go. */
  onDragEnd?: (point: MapPoint) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!drop || !el || typeof el.animate !== 'function' || prefersReducedMotion()) return;
    el.animate(
      [
        { transform: 'translateY(-8px)', boxShadow: '0 10px 8px -6px rgba(0,0,0,.3)' },
        { transform: 'translateY(0)' },
      ],
      { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }, [drop]);

  return (
    <Marker
      {...GOONG_MARKER_DEFAULT_PROPS}
      latitude={latitude}
      longitude={longitude}
      offsetLeft={-size / 2}
      offsetTop={-size / 2}
      draggable={!!onDragEnd}
      onDragEnd={onDragEnd ? (e: DragEvent) => onDragEnd(pointOf(e)) : undefined}
    >
      <div
        ref={ref}
        role={onSelect ? 'button' : title ? 'img' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        title={title}
        aria-label={title}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !onSelect) return;
          e.stopPropagation();
          onSelect();
        }}
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: shape === 'dot' ? 9999 : 3,
          transform: shape === 'diamond' ? 'rotate(45deg)' : undefined,
          background: barred ? `${SUSPENDED_BAR}, ${color}` : color,
          border: '2px solid #fff',
          boxShadow: ring
            ? `0 0 0 3px ${ring}, 0 1px 3px rgba(0,0,0,.35)`
            : '0 1px 3px rgba(0,0,0,.35)',
          cursor: onDragEnd ? 'grab' : onSelect ? 'pointer' : undefined,
          transition: 'width 160ms, height 160ms',
        }}
      >
        {onSelect ? (
          <span aria-hidden="true" className="absolute -inset-[11px] rounded-full" />
        ) : null}
        {beacon ? (
          <span
            aria-hidden="true"
            className="sb-slot-beacon pointer-events-none absolute -inset-[7px] rounded-full border-[3px] border-brand"
            style={{ animationIterationCount: 1 }}
          />
        ) : null}
      </div>
    </Marker>
  );
}

/**
 * The round handle beyond the end of the selected slot: drag it around the slot to turn it.
 * The bearing snaps to whole degrees, and onto the street when within a few degrees of it.
 */
function TurnHandle({
  center,
  bearing,
  lengthMeters,
  streetBearing,
  onTurn,
}: {
  center: MapPoint;
  bearing: number;
  lengthMeters: number;
  streetBearing: number | null;
  onTurn: (bearing: number) => void;
}) {
  const reach = lengthMeters / 2 + HANDLE_GAP_METERS;
  const t = (bearing * Math.PI) / 180;
  const [longitude, latitude] = offsetMeters(center, Math.sin(t) * reach, Math.cos(t) * reach);
  const turnTo = (event: DragEvent) => {
    const next = bearingTowards(center, pointOf(event));
    if (next != null) onTurn(snapBearing(next, streetBearing));
  };
  return (
    <Marker
      {...GOONG_MARKER_DEFAULT_PROPS}
      latitude={latitude}
      longitude={longitude}
      offsetLeft={-15}
      offsetTop={-15}
      draggable
      onDrag={turnTo}
      onDragEnd={turnTo}
    >
      <div
        role="img"
        aria-label="Tay cầm xoay ô: kéo vòng quanh ô để đổi hướng"
        title="Kéo vòng quanh ô để xoay"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[30px] w-[30px] cursor-grab items-center justify-center rounded-full border-2 border-brand bg-white text-brand shadow-card active:cursor-grabbing"
      >
        <Icon name="rotate-right" size={16} color="currentColor" />
      </div>
    </Marker>
  );
}

/** The tape-measure label halfway along the batch segment; red when it is shorter than one slot. */
function RulerLabel({ at, ruler }: { at: MapPoint; ruler: RulerInfo }) {
  return (
    <Marker {...GOONG_MARKER_DEFAULT_PROPS} latitude={at.latitude} longitude={at.longitude}>
      <div style={{ transform: 'translate(-50%, calc(-100% - 10px))' }}>
        <p
          aria-live="polite"
          className={[
            'sb-pop whitespace-nowrap rounded-[10px] border-2 px-2.5 py-1 font-sign text-[16px] font-bold leading-tight shadow-sheet font-tabular',
            ruler.tooShort
              ? 'border-[#8F1717] bg-[#FDEBEA] text-[#8F1717]'
              : 'border-brand bg-white text-[#111C2B]',
          ].join(' ')}
        >
          {rulerText(ruler)}
        </p>
      </div>
    </Marker>
  );
}

/** The zone whose street the camera flies: the selected slot's, else the one with most slots. */
function flightZone(slots: readonly WardSlot[], selectedSlotId: number | null): number | null {
  const selected = slots.find((s) => s.slotId === selectedSlotId);
  if (selected) return selected.zoneId;
  const counts = new Map<number, number>();
  for (const s of slots) counts.set(s.zoneId, (counts.get(s.zoneId) ?? 0) + 1);
  let best: number | null = null;
  for (const [zoneId, count] of counts)
    if (best == null || count > counts.get(best)!) best = zoneId;
  return best;
}

/**
 * Ward grid map: slots by status, street features with their no-business / clearance rings, and
 * the draft pins. In 3D the map tilts, slots stand as blocks (taller = more taken) with OSM
 * buildings and house numbers around them; the selected slot can be dragged and turned.
 */
export function SlotGridMap({
  slots,
  features,
  selectedSlotId,
  highlightedSlotIds,
  pins,
  candidates,
  focus,
  myLocation,
  ruler,
  streetBearings = NO_BEARINGS,
  draft,
  onMapClick,
  onSelectSlot,
  onMoveSlot,
  onTurnSlot,
}: Props) {
  const [mapStyle, , layerMode, isDark, setLayerMode] = useMapBaseLayer();
  const camera = useSceneCamera(
    (() => {
      const first = slots[0] ?? features[0];
      return first
        ? { latitude: first.latitude, longitude: first.longitude, zoom: 18 }
        : { latitude: DEFAULT_CENTER[0], longitude: DEFAULT_CENTER[1], zoom: 18 };
    })(),
  );
  const { viewport } = camera;
  const [raised, setRaised] = useState(false);
  const [heat, setHeat] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  const focusKey = focus?.key;
  useEffect(() => {
    if (!focus) return;
    camera.centreOn(focus.point, 18);
    // Only a new key re-centres; the point object itself is recreated on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  // The line between two batch pins runs from the first to the second, then the tape label pops.
  const segment = pins.length === 2 ? ([pins[0]!, pins[1]!] as const) : null;
  const segmentKey = segment
    ? `${segment[0].latitude},${segment[0].longitude},${segment[1].latitude},${segment[1].longitude}`
    : null;
  const animate = !prefersReducedMotion() && typeof requestAnimationFrame === 'function';
  const [run, setRun] = useState<{ key: string | null; t: number }>({ key: null, t: 1 });
  useEffect(() => {
    if (!segmentKey || !animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / LINE_RUN_MS);
      setRun({ key: segmentKey, t });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [segmentKey, animate]);
  // A segment that has not started running yet draws from zero length (no flash of the full line).
  const lineRun = !segmentKey || !animate ? 1 : run.key === segmentKey ? run.t : 0;

  // goong-js registers the error handler once, when the map is created; keep the library's
  // own logging and say, over the map, that the base tiles did not come. Only a tile that failed
  // to load counts: any other map error (a style being swapped, a layer) is not the base map's.
  const onError = useCallback((event: unknown) => {
    const fallback = (GOONG_MAP_DEFAULT_PROPS as { onError?: (e: unknown) => void }).onError;
    fallback?.(event);
    const e = event as { tile?: unknown; sourceId?: string } | undefined;
    // Reported from inside the map's render; set the flag after it (never during a render).
    if (e?.tile) setTimeout(() => setTilesFailed(true), 0);
  }, []);
  // The notice clears itself: a tile that failed once usually loads on the next pan.
  useEffect(() => {
    if (!tilesFailed) return;
    const timer = setTimeout(() => setTilesFailed(false), 8000);
    return () => clearTimeout(timer);
  }, [tilesFailed]);

  const sceneSlots = useMemo(
    () => slots.map((s) => ({ ...s, bearingDegrees: s.bearingDegrees ?? null })),
    [slots],
  );
  // The parent builds `draft` afresh on every render; key it by its contents so panning the map
  // (a re-render per frame) does not hand the slot layers new data and make them blink.
  const draftKey = draft
    ? `${draft.slotId}|${draft.position?.latitude}|${draft.position?.longitude}|${draft.bearing}`
    : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDraft = useMemo(() => draft ?? null, [draftKey]);
  const blocks = useMemo(
    () =>
      slotBlocks(sceneSlots, streetBearings, {
        selectedId: selectedSlotId,
        highlightedIds: highlightedSlotIds,
        draft: stableDraft,
      }),
    [sceneSlots, streetBearings, selectedSlotId, highlightedSlotIds, stableDraft],
  );
  const pinData = useMemo(
    () =>
      slotPins(sceneSlots, {
        selectedId: selectedSlotId,
        highlightedIds: highlightedSlotIds,
        draft: stableDraft,
      }),
    [sceneSlots, selectedSlotId, highlightedSlotIds, stableDraft],
  );
  // One style object per (layer, theme): a new object each render would make the map reload it.
  const sceneMapStyle = useMemo(() => sceneStyle(layerMode, isDark), [layerMode, isDark]);
  const obstacles = useMemo(() => obstacleBlocks(features), [features]);
  const heatData = useMemo(() => occupancyHeat(slots), [slots]);

  const flyZone = flightZone(slots, selectedSlotId);
  const flyBearing = flyZone == null ? null : (streetBearings.get(flyZone) ?? null);
  const flyPoints = flyZone == null ? [] : slots.filter((s) => s.zoneId === flyZone);
  const canFly = flyBearing != null && flyPoints.length >= 2 && !reducedMotion();

  const selected = slots.find((s) => s.slotId === selectedSlotId) ?? null;
  const editable = selected?.canEditGeometry ? selected : null;
  const selectedStreet = selected ? (streetBearings.get(selected.zoneId) ?? null) : null;
  const drafting = draft && selected && draft.slotId === selected.slotId ? draft : null;
  const selectedAt = drafting?.position ?? selected;
  const selectedBearing = selected
    ? (drafting?.bearing ?? effectiveBearing(selected, selectedStreet))
    : 0;

  const toggleRaised = () => {
    const next = !raised;
    setRaised(next);
    camera.tilt(next, selectedStreet ?? flyBearing);
  };
  const maxZoom = raised && layerMode === 'street' ? SCENE_MAX_ZOOM : 20;
  const rail = [
    [
      {
        label: layerMode === 'satellite' ? 'Về bản đồ đường phố' : 'Xem ảnh vệ tinh',
        icon: 'satellite' as const,
        pressed: layerMode === 'satellite',
        onPress: () => setLayerMode(layerMode === 'satellite' ? 'street' : 'satellite'),
      },
      {
        label: raised ? 'Về bản đồ phẳng (2D)' : 'Xem 3D: dựng ô và nhà thành khối',
        icon: 'cube-outline' as const,
        text: '3D',
        pressed: raised,
        onPress: toggleRaised,
      },
      {
        label: heat ? 'Tắt bản đồ nhiệt' : 'Bản đồ nhiệt: chỗ đỏ là nhiều ô đang được thuê',
        icon: 'fire' as const,
        pressed: heat,
        onPress: () => setHeat((h) => !h),
      },
      ...(raised
        ? [
            {
              label: camera.flying
                ? 'Dừng bay'
                : canFly
                  ? 'Bay dọc phố'
                  : 'Bay dọc phố (cần ít nhất hai ô thẳng hàng)',
              icon: (camera.flying ? 'stop-circle-outline' : 'video-outline') as
                'stop-circle-outline' | 'video-outline',
              pressed: camera.flying,
              disabled: !canFly && !camera.flying,
              onPress: () => {
                if (camera.flying) camera.stopFlight();
                else if (flyBearing != null) camera.fly(flyPoints, flyBearing);
              },
            },
          ]
        : []),
    ],
    [
      { label: 'Phóng to', icon: 'plus' as const, onPress: () => camera.zoomBy(1, maxZoom) },
      { label: 'Thu nhỏ', icon: 'minus' as const, onPress: () => camera.zoomBy(-1, maxZoom) },
      ...(raised && Math.abs(viewport.bearing) > 0.5
        ? [
            {
              label: 'Quay về hướng Bắc',
              icon: 'compass-outline' as const,
              onPress: camera.resetNorth,
            },
          ]
        : []),
    ],
  ];

  // GeoJSON handed to <Source> must keep its identity between renders: a new object makes the map
  // re-upload it, and every pan re-renders this component.
  const clearanceFeatures = useMemo(() => features.filter((f) => f.clearanceMeters), [features]);
  const clearanceData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: clearanceFeatures.map((f) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            clearanceRingCoords(
              { latitude: f.latitude, longitude: f.longitude },
              f.clearanceMeters!,
            ),
          ],
        },
      })),
    }),
    [clearanceFeatures],
  );
  const gpsLat = myLocation?.latitude;
  const gpsLng = myLocation?.longitude;
  const gpsAccuracy = myLocation?.accuracy;
  const accuracyData = useMemo(
    () =>
      gpsLat != null && gpsLng != null && gpsAccuracy
        ? {
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                clearanceRingCoords({ latitude: gpsLat, longitude: gpsLng }, gpsAccuracy),
              ],
            },
          }
        : null,
    [gpsLat, gpsLng, gpsAccuracy],
  );
  const eased = 1 - (1 - lineRun) ** 3;
  const lineEnd = segment
    ? {
        latitude: segment[0].latitude + (segment[1].latitude - segment[0].latitude) * eased,
        longitude: segment[0].longitude + (segment[1].longitude - segment[0].longitude) * eased,
      }
    : null;
  const midpoint = segment
    ? {
        latitude: (segment[0].latitude + segment[1].latitude) / 2,
        longitude: (segment[0].longitude + segment[1].longitude) / 2,
      }
    : null;
  const accuracy = myLocation?.accuracy;

  return (
    <div className="absolute inset-0">
      <MapGL
        {...GOONG_MAP_DEFAULT_PROPS}
        {...viewport}
        {...camera.transitionProps}
        maxPitch={60}
        // Vector 3D (street) stays sharp when zoomed right in; raster bases stop at their own z19.
        maxZoom={maxZoom}
        mapOptions={SCENE_MAP_OPTIONS}
        width="100%"
        height="100%"
        mapStyle={raised ? sceneMapStyle : mapStyle}
        goongApiAccessToken={env.goongMaptilesKey}
        onError={onError}
        interactiveLayerIds={raised ? SLOT_TAP_LAYERS : undefined}
        onViewportChange={(v: SceneViewport) => camera.onUserMove(v)}
        onClick={(event: MapEvent & { features?: { properties?: { slotId?: number } }[] }) => {
          const hit = event.features?.find((f) => f.properties?.slotId != null);
          const slot = hit ? slots.find((s) => s.slotId === hit.properties!.slotId) : undefined;
          if (slot) {
            onSelectSlot(slot);
            return;
          }
          onMapClick({ latitude: round(event.lngLat[1]), longitude: round(event.lngLat[0]) });
        }}
      >
        {heat && <OccupancyHeat data={heatData} />}

        {clearanceFeatures.length > 0 && (
          <Source id="ward-clearance" type="geojson" data={clearanceData}>
            <Layer
              id="ward-clearance-fill"
              type="fill"
              paint={{ 'fill-color': '#B42318', 'fill-opacity': 0.05 }}
            />
            <Layer
              id="ward-clearance-line"
              type="line"
              paint={{ 'line-color': '#B42318', 'line-width': 1, 'line-dasharray': [4, 4] }}
            />
          </Source>
        )}

        <SlotBlocks data={blocks} raised={raised} />
        <ObstacleBlocks data={obstacles} visible={raised} />
        <SlotPins data={pinData} visible={raised} />

        {myLocation && accuracy != null && accuracy > 0 && accuracyData && (
          <Source id="ward-gps-accuracy" type="geojson" data={accuracyData}>
            <Layer
              id="ward-gps-accuracy-fill"
              type="fill"
              paint={{ 'fill-color': accuracyColor(accuracy), 'fill-opacity': 0.1 }}
            />
            <Layer
              id="ward-gps-accuracy-line"
              type="line"
              paint={{ 'line-color': accuracyColor(accuracy), 'line-width': 1.5 }}
            />
          </Source>
        )}

        {segment && lineEnd && (
          <Source
            id="ward-pin-line"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [segment[0].longitude, segment[0].latitude],
                  [lineEnd.longitude, lineEnd.latitude],
                ],
              },
            }}
          >
            <Layer
              id="ward-pin-line-layer"
              type="line"
              layout={{ 'line-cap': 'round' }}
              paint={{
                'line-color': palette.light.brand,
                'line-width': 3,
                'line-dasharray': [2, 1.5],
              }}
            />
          </Source>
        )}

        {!raised &&
          features.map((f) => (
            <Dot
              key={`f-${f.featureId}`}
              latitude={f.latitude}
              longitude={f.longitude}
              size={14}
              shape="diamond"
              color={f.blocksBusiness ? FEATURE_BLOCK_COLOR : FEATURE_OTHER_COLOR}
              title={`${featureTypeLabels[f.featureType]}: ${f.label}${f.blocksBusiness ? ' · cấm kinh doanh' : ''}`}
            />
          ))}

        {/* In 3D the blocks are the slots (tap one to select it); only the selected slot keeps its dot, as the drag handle. */}
        {slots.map((s) => {
          const isSelected = s.slotId === selectedSlotId;
          if (raised && !isSelected) return null;
          const highlighted = highlightedSlotIds?.has(s.slotId) ?? false;
          const at = isSelected && selectedAt ? selectedAt : s;
          return (
            <Dot
              key={`s-${s.slotId}`}
              latitude={at.latitude}
              longitude={at.longitude}
              size={isSelected || highlighted ? 20 : 14}
              color={SLOT_DOT_COLORS[s.status]}
              barred={s.status === 'SUSPENDED'}
              ring={highlighted ? palette.light.primary : undefined}
              beacon={isSelected}
              title={`${s.slotCode} · ${slotStatusLabels[s.status]}${isSelected && editable && onMoveSlot ? ' · kéo để dời ô' : ''}`}
              onSelect={() => onSelectSlot(s)}
              onDragEnd={
                isSelected && editable && onMoveSlot ? (p) => onMoveSlot(editable, p) : undefined
              }
            />
          );
        })}

        {editable && selectedAt && onTurnSlot && viewport.zoom >= 17 && (
          <TurnHandle
            center={selectedAt}
            bearing={selectedBearing}
            lengthMeters={editable.lengthMeters ?? PLACEHOLDER_LENGTH_METERS}
            streetBearing={selectedStreet}
            onTurn={(b) => onTurnSlot(editable, b)}
          />
        )}

        {myLocation && (
          <Dot
            latitude={myLocation.latitude}
            longitude={myLocation.longitude}
            size={16}
            color="#1A73E8"
            ring="#1A73E8"
            title="Vị trí của bạn"
          />
        )}

        {/* The selected slot's new position is its own (draggable) dot; only other pins show here. */}
        {pins.map((p, i) =>
          drafting?.position === p ? null : (
            <Dot
              key={`p-${i}-${p.latitude}-${p.longitude}`}
              latitude={p.latitude}
              longitude={p.longitude}
              size={18}
              color={palette.light.primary}
              drop
            />
          ),
        )}

        {candidates.map((c) => (
          <Dot
            key={`b-${c.index}`}
            latitude={c.latitude}
            longitude={c.longitude}
            size={10}
            color={
              c.issues.some((i) => i.severity === 'BLOCK')
                ? '#B42318'
                : c.issues.length
                  ? '#C98A04'
                  : palette.light.tertiary
            }
            title={c.proposedCode}
          />
        ))}

        {ruler && midpoint && lineRun >= 1 && <RulerLabel at={midpoint} ruler={ruler} />}
      </MapGL>

      {/* Right edge, under the search bar on phones; the bottom-right corner is left to the
          app-wide "Hỏi trợ lý" bubble. */}
      <div className="pointer-events-none absolute right-sm top-[76px] z-[2] md:top-sm">
        <MapRail groups={rail} />
      </div>

      {tilesFailed && (
        <div className="pointer-events-none absolute left-sm right-[68px] top-[76px] z-[2] flex justify-center">
          <p
            role="status"
            className="pointer-events-auto flex items-center gap-xs rounded-full bg-card/95 px-md py-xs text-body-sm font-medium text-text shadow-card ring-1 ring-border backdrop-blur-md"
          >
            Không tải được nền bản đồ, vị trí ô vẫn đúng
            <button
              type="button"
              onClick={() => setTilesFailed(false)}
              className="ml-1 rounded-full px-1.5 text-muted hover:text-text"
              aria-label="Ẩn thông báo nền bản đồ"
            >
              ×
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
