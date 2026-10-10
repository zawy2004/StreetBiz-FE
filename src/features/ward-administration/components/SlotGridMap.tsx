import { useCallback, useEffect, useRef, useState } from 'react';
import MapGL, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapEvent,
} from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';

import { env } from '@/core/config/env';
import { palette } from '@/theme';
import { DEFAULT_CENTER } from '@/features/sidewalk-slots/map-constants';
import {
  GOONG_MAP_DEFAULT_PROPS,
  GOONG_MARKER_DEFAULT_PROPS,
  GOONG_NAV_CONTROL_DEFAULT_PROPS,
  useMapBaseLayer,
} from '@/features/sidewalk-slots/components/GoongMapBaseLayers';
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
  onMapClick: (point: MapPoint) => void;
  onSelectSlot: (slot: WardSlot) => void;
};

type Viewport = { latitude: number; longitude: number; zoom: number };

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** How long the line between two batch pins takes to run from the first to the second. */
const LINE_RUN_MS = 400;

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
          cursor: onSelect ? 'pointer' : undefined,
          transition: 'width 160ms, height 160ms',
        }}
      >
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

/** Ward grid map: slots by status, street features with their no-business / clearance rings, and the draft pins. */
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
  onMapClick,
  onSelectSlot,
}: Props) {
  const [mapStyle, layerSwitcher] = useMapBaseLayer();
  const [viewport, setViewport] = useState<Viewport>(() => {
    const first = slots[0] ?? features[0];
    return first
      ? { latitude: first.latitude, longitude: first.longitude, zoom: 18 }
      : { latitude: DEFAULT_CENTER[0], longitude: DEFAULT_CENTER[1], zoom: 18 };
  });
  const [tilesFailed, setTilesFailed] = useState(false);

  const focusKey = focus?.key;
  useEffect(() => {
    if (!focus) return;
    setViewport((v) => ({
      latitude: focus.point.latitude,
      longitude: focus.point.longitude,
      zoom: Math.max(v.zoom, 18),
    }));
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
  // own logging and also say, over the map, that the base tiles did not come.
  const onError = useCallback((event: unknown) => {
    const fallback = (GOONG_MAP_DEFAULT_PROPS as { onError?: (e: unknown) => void }).onError;
    fallback?.(event);
    setTilesFailed(true);
  }, []);

  const clearanceFeatures = features.filter((f) => f.clearanceMeters);
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
        width="100%"
        height="100%"
        mapStyle={mapStyle}
        goongApiAccessToken={env.goongMaptilesKey}
        onError={onError}
        onViewportChange={(v: Viewport) =>
          setViewport({ latitude: v.latitude, longitude: v.longitude, zoom: v.zoom })
        }
        onClick={(event: MapEvent) =>
          onMapClick({ latitude: round(event.lngLat[1]), longitude: round(event.lngLat[0]) })
        }
      >
        <NavigationControl
          {...GOONG_NAV_CONTROL_DEFAULT_PROPS}
          // Clear of the app-wide "Hỏi trợ lý" bubble on phones (bottom-right of the window).
          className="bottom-[96px] md:bottom-[12px]"
          style={{ right: 12 }}
          showCompass={false}
        />
        <div className="absolute right-3 top-[124px] z-[1] md:top-3 [&>div]:!static [&>div]:!rounded-[12px] [&>div]:!shadow-card [&_button]:!min-h-10 [&_button]:!px-sm [&_button]:!font-medium">
          {layerSwitcher}
        </div>

        {clearanceFeatures.length > 0 && (
          <Source
            id="ward-clearance"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: clearanceFeatures.map((f) => ({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    clearanceRingCoords(
                      { latitude: f.latitude, longitude: f.longitude },
                      f.clearanceMeters!,
                    ),
                  ],
                },
              })),
            }}
          >
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

        {myLocation && accuracy != null && accuracy > 0 && (
          <Source
            id="ward-gps-accuracy"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [clearanceRingCoords(myLocation, accuracy)],
              },
            }}
          >
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

        {features.map((f) => (
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

        {slots.map((s) => {
          const selected = s.slotId === selectedSlotId;
          const highlighted = highlightedSlotIds?.has(s.slotId) ?? false;
          return (
            <Dot
              key={`s-${s.slotId}`}
              latitude={s.latitude}
              longitude={s.longitude}
              size={selected || highlighted ? 20 : 14}
              color={SLOT_DOT_COLORS[s.status]}
              barred={s.status === 'SUSPENDED'}
              ring={highlighted ? palette.light.primary : undefined}
              beacon={selected}
              title={`${s.slotCode} · ${slotStatusLabels[s.status]}`}
              onSelect={() => onSelectSlot(s)}
            />
          );
        })}

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

        {pins.map((p, i) => (
          <Dot
            key={`p-${i}-${p.latitude}-${p.longitude}`}
            latitude={p.latitude}
            longitude={p.longitude}
            size={18}
            color={palette.light.primary}
            drop
          />
        ))}

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

      {tilesFailed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[72px] z-[2] flex justify-center px-sm">
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
