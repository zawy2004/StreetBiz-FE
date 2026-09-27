import { useState } from 'react';
import MapGL, { Layer, Marker, NavigationControl, Source, type MapEvent } from '@goongmaps/goong-map-react';
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

export type MapPoint = { latitude: number; longitude: number };

type Props = {
  slots: WardSlot[];
  features: WardStreetFeature[];
  selectedSlotId: number | null;
  pins: MapPoint[];
  candidates: BatchCandidate[];
  onMapClick: (point: MapPoint) => void;
  onSelectSlot: (slot: WardSlot) => void;
};

type Viewport = { latitude: number; longitude: number; zoom: number };

const statusColor: Record<WardSlot['status'], string> = {
  AVAILABLE: palette.light.tertiary,
  PENDING_APPLICATION: '#C98A04',
  ACTIVE: palette.light.indigo,
  SUSPENDED: palette.light.muted,
};

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Equirectangular approximation of a metre-radius ring around `center` -- good
 * enough for the few-metre-to-few-hundred-metre clearance radii drawn here,
 * without pulling in a geo library just for this one polygon.
 */
function clearanceRingCoords(center: MapPoint, radiusMeters: number, steps = 48): [number, number][] {
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

/** A plain coloured dot marker; swallows its click so tapping it doesn't also drop a pin on the map underneath. */
function Dot({
  latitude,
  longitude,
  size,
  color,
  title,
  onSelect,
}: {
  latitude: number;
  longitude: number;
  size: number;
  color: string;
  title?: string;
  onSelect?: () => void;
}) {
  return (
    <Marker
      {...GOONG_MARKER_DEFAULT_PROPS}
      latitude={latitude}
      longitude={longitude}
      offsetLeft={-size / 2}
      offsetTop={-size / 2}
    >
      <div
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        title={title}
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
          width: size,
          height: size,
          borderRadius: 9999,
          background: color,
          border: '2px solid #fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.35)',
          cursor: onSelect ? 'pointer' : undefined,
        }}
      />
    </Marker>
  );
}

/** Ward grid map: slots by status, street features with their no-business / clearance rings, and the draft pins. */
export function SlotGridMap({
  slots,
  features,
  selectedSlotId,
  pins,
  candidates,
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

  const clearanceFeatures = features.filter((f) => f.clearanceMeters);

  return (
    <div className="h-80 overflow-hidden rounded-sm border border-border sm:h-[28rem]">
      <MapGL
        {...GOONG_MAP_DEFAULT_PROPS}
        {...viewport}
        width="100%"
        height="100%"
        mapStyle={mapStyle}
        goongApiAccessToken={env.goongMaptilesKey}
        onViewportChange={(v: Viewport) =>
          setViewport({ latitude: v.latitude, longitude: v.longitude, zoom: v.zoom })
        }
        onClick={(event: MapEvent) =>
          onMapClick({ latitude: round(event.lngLat[1]), longitude: round(event.lngLat[0]) })
        }
      >
        <NavigationControl
          {...GOONG_NAV_CONTROL_DEFAULT_PROPS}
          style={{ position: 'absolute', bottom: 46, right: 10 }}
          showCompass={false}
        />
        {layerSwitcher}

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
                    clearanceRingCoords({ latitude: f.latitude, longitude: f.longitude }, f.clearanceMeters!),
                  ],
                },
              })),
            }}
          >
            <Layer id="ward-clearance-fill" type="fill" paint={{ 'fill-color': '#B42318', 'fill-opacity': 0.05 }} />
            <Layer
              id="ward-clearance-line"
              type="line"
              paint={{ 'line-color': '#B42318', 'line-width': 1, 'line-dasharray': [4, 4] }}
            />
          </Source>
        )}

        {pins.length === 2 && (
          <Source
            id="ward-pin-line"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: pins.map((p) => [p.longitude, p.latitude]) },
            }}
          >
            <Layer
              id="ward-pin-line-layer"
              type="line"
              paint={{ 'line-color': palette.light.primary, 'line-width': 2, 'line-dasharray': [3, 3] }}
            />
          </Source>
        )}

        {features.map((f) => (
          <Dot
            key={`f-${f.featureId}`}
            latitude={f.latitude}
            longitude={f.longitude}
            size={14}
            color={f.blocksBusiness ? '#B42318' : '#C98A04'}
            title={`${featureTypeLabels[f.featureType]}: ${f.label}${f.blocksBusiness ? ' · cấm kinh doanh' : ''}`}
          />
        ))}

        {slots.map((s) => (
          <Dot
            key={`s-${s.slotId}`}
            latitude={s.latitude}
            longitude={s.longitude}
            size={s.slotId === selectedSlotId ? 20 : 14}
            color={statusColor[s.status]}
            title={`${s.slotCode} · ${slotStatusLabels[s.status]}`}
            onSelect={() => onSelectSlot(s)}
          />
        ))}

        {pins.map((p, i) => (
          <Dot key={`p-${i}`} latitude={p.latitude} longitude={p.longitude} size={18} color={palette.light.primary} />
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
      </MapGL>
    </div>
  );
}
