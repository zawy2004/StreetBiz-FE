import { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Marker, NavigationControl, Popup, type MapRef } from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';

import { Button, Icon } from '@/components/common';
import { env } from '@/core/config/env';
import { palette } from '@/theme';
import { SideApiError, type SidewalkSlot } from '@/core/api/side-api';
import { DEFAULT_CENTER } from '../map-constants';
import {
  GOONG_MAP_DEFAULT_PROPS,
  GOONG_MARKER_DEFAULT_PROPS,
  GOONG_NAV_CONTROL_DEFAULT_PROPS,
  GOONG_POPUP_DEFAULT_PROPS,
  useMapBaseLayer,
} from './GoongMapBaseLayers';

export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

/** The subset of the underlying goong-js/Mapbox GL map instance this file actually calls. */
type GoongMap = {
  getBounds(): { getNorth(): number; getSouth(): number; getEast(): number; getWest(): number };
  getContainer(): HTMLElement;
  on(type: 'moveend', handler: () => void): void;
  off(type: 'moveend', handler: () => void): void;
  resize(): void;
};

/** onViewportChange's prop type is a bare `Function` in goong-map-react's own types. */
type Viewport = { latitude: number; longitude: number; zoom: number };

type ZoneGroup = {
  zoneId: number;
  zoneName: string;
  latitude: number;
  longitude: number;
  totalCount: number;
  availableCount: number;
};

type Props = {
  slots: SidewalkSlot[];
  onBoundsChange: (bounds: Bounds) => void;
  error: unknown;
  onRetry: () => void;
  onViewZoneDiagram: (zoneId: number) => void;
  /** No route around the viewport yet: show a hint to pan the map. */
  empty?: boolean;
};

export function SlotMapView({
  slots,
  onBoundsChange,
  error,
  onRetry,
  onViewZoneDiagram,
  empty = false,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyle, layerSwitcher] = useMapBaseLayer();
  const [viewport, setViewport] = useState<Viewport>({
    latitude: DEFAULT_CENTER[0],
    longitude: DEFAULT_CENTER[1],
    zoom: 17,
  });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  // goong-js/Mapbox GL fires onViewportChange continuously while panning, unlike
  // Leaflet's dedicated "moveend" event -- go through the native map instead so
  // onBoundsChange only fires once the pan/zoom settles. It also measures its
  // container's size once, at mount; inside a flex layout the container is still
  // 0-height at that instant, so tiles never load until something nudges it to
  // resize -- this watches the container and does that on every resize.
  useEffect(() => {
    const map = mapRef.current?.getMap() as GoongMap | undefined;
    if (!map) return;
    const handleMoveEnd = () => {
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
    };
    map.on('moveend', handleMoveEnd);
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(map.getContainer());
    return () => {
      map.off('moveend', handleMoveEnd);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoneGroups = useMemo<ZoneGroup[]>(() => {
    const byZone = new Map<number, { zoneName: string; slots: SidewalkSlot[] }>();
    for (const s of slots) {
      const entry = byZone.get(s.zoneId);
      if (entry) entry.slots.push(s);
      else byZone.set(s.zoneId, { zoneName: s.zoneName, slots: [s] });
    }
    return [...byZone.entries()].map(([zoneId, { zoneName, slots: zoneSlots }]) => ({
      zoneId,
      zoneName,
      latitude: zoneSlots.reduce((sum, s) => sum + s.latitude, 0) / zoneSlots.length,
      longitude: zoneSlots.reduce((sum, s) => sum + s.longitude, 0) / zoneSlots.length,
      totalCount: zoneSlots.length,
      availableCount: zoneSlots.filter((s) => s.slotStatus === 'AVAILABLE').length,
    }));
  }, [slots]);

  const selectedZone = zoneGroups.find((z) => z.zoneId === selectedZoneId) ?? null;

  return (
    <div className="relative h-full min-h-0 w-full">
      <MapGL
        {...GOONG_MAP_DEFAULT_PROPS}
        ref={mapRef}
        {...viewport}
        width="100%"
        height="100%"
        mapStyle={mapStyle}
        goongApiAccessToken={env.goongMaptilesKey}
        onViewportChange={(v: Viewport) =>
          setViewport({ latitude: v.latitude, longitude: v.longitude, zoom: v.zoom })
        }
      >
        <NavigationControl
          {...GOONG_NAV_CONTROL_DEFAULT_PROPS}
          style={{ position: 'absolute', bottom: 46, right: 10 }}
          showCompass={false}
        />
        {layerSwitcher}
        {zoneGroups.map((zone) => {
          const open = zone.availableCount > 0;
          const selected = zone.zoneId === selectedZoneId;
          return (
            <Marker
              {...GOONG_MARKER_DEFAULT_PROPS}
              key={zone.zoneId}
              latitude={zone.latitude}
              longitude={zone.longitude}
              offsetLeft={-22}
              offsetTop={-22}
            >
              {/* A route sign: the slot count on a plate, green while any slot is free. */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`${zone.zoneName}: ${zone.totalCount} ô`}
                onClick={() => setSelectedZoneId(zone.zoneId)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedZoneId(zone.zoneId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  height: 44,
                  padding: '0 10px',
                  borderRadius: 12,
                  background: open ? palette.light.tertiary : '#EEF1F4',
                  border: '3px solid white',
                  boxShadow: selected
                    ? `0 0 0 3px ${palette.light.brand}, 0 8px 18px -6px rgba(17,28,43,.5)`
                    : '0 6px 14px -6px rgba(17,28,43,.55)',
                  color: open ? 'white' : '#2B3640',
                  fontWeight: 800,
                  fontSize: 16,
                  fontFamily: "'Archivo', 'Be Vietnam Pro', sans-serif",
                  cursor: 'pointer',
                  transform: selected ? 'scale(1.08)' : undefined,
                  transition: 'transform 200ms cubic-bezier(.2,.8,.2,1), box-shadow 200ms',
                }}
              >
                {zone.totalCount}
              </div>
            </Marker>
          );
        })}
        {selectedZone && (
          <Popup
            {...GOONG_POPUP_DEFAULT_PROPS}
            latitude={selectedZone.latitude}
            longitude={selectedZone.longitude}
            closeButton
            closeOnClick={false}
            onClose={() => setSelectedZoneId(null)}
          >
            <div className="flex min-w-[200px] flex-col gap-xs p-1 text-text">
              <strong className="font-sign text-[18px] font-extrabold leading-tight">
                {selectedZone.zoneName}
              </strong>
              <span className="text-body-sm text-muted">
                {selectedZone.totalCount} ô · {selectedZone.availableCount} còn trống
              </span>
              <Button label="Xem sơ đồ" onPress={() => onViewZoneDiagram(selectedZone.zoneId)} />
            </div>
          </Popup>
        )}
      </MapGL>

      {empty && error === null ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-md">
          <p className="flex items-center gap-1.5 rounded-full bg-card/95 px-md py-xs text-body-sm font-semibold text-text shadow-card ring-1 ring-border backdrop-blur">
            <Icon
              name="map-marker-radius-outline"
              size={18}
              color="currentColor"
              className="text-primary"
            />
            Kéo bản đồ tới khu vực có ô vỉa hè
          </p>
        </div>
      ) : null}

      {error !== null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center px-md">
          <div className="pointer-events-auto flex items-center gap-sm rounded-[14px] bg-card px-md py-xs shadow-sheet ring-1 ring-border">
            <Icon
              name="alert-circle-outline"
              size={18}
              color="currentColor"
              className="shrink-0 text-error"
            />
            <span className="text-body-sm font-semibold text-error">
              {error instanceof SideApiError || error instanceof Error
                ? error.message
                : 'Không tải được dữ liệu.'}
            </span>
            <button
              type="button"
              className="h-10 shrink-0 rounded-[10px] px-sm text-label font-semibold text-primary hover:bg-tint-primary"
              onClick={onRetry}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
