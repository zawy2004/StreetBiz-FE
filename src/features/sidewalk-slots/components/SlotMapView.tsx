import { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Marker, NavigationControl, Popup, type MapRef } from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';

import { Button } from '@/components/common';
import { env } from '@/core/config/env';
import { colors } from '@/theme';
import { SideApiError, type SidewalkSlot } from '@/core/api/side-api';
import { DEFAULT_CENTER } from '../map-constants';
import {
  GOONG_MAP_DEFAULT_PROPS,
  GOONG_MARKER_DEFAULT_PROPS,
  GOONG_NAV_CONTROL_DEFAULT_PROPS,
  GOONG_POPUP_DEFAULT_PROPS,
  useMapBaseLayer,
} from './MapBaseLayers';

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
};

export function SlotMapView({ slots, onBoundsChange, error, onRetry, onViewZoneDiagram }: Props) {
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
      onBoundsChange({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
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
        onViewportChange={(v: Viewport) => setViewport({ latitude: v.latitude, longitude: v.longitude, zoom: v.zoom })}
      >
        <NavigationControl
          {...GOONG_NAV_CONTROL_DEFAULT_PROPS}
          style={{ position: 'absolute', bottom: 46, right: 10 }}
          showCompass={false}
        />
        {layerSwitcher}
        {zoneGroups.map((zone) => (
          <Marker
            {...GOONG_MARKER_DEFAULT_PROPS}
            key={zone.zoneId}
            latitude={zone.latitude}
            longitude={zone.longitude}
            offsetLeft={-18}
            offsetTop={-18}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedZoneId(zone.zoneId)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedZoneId(zone.zoneId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 9999,
                background: zone.availableCount > 0 ? colors.tertiary : colors.muted,
                border: '3px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,.35)',
                color: 'white',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'sans-serif',
                cursor: 'pointer',
              }}
            >
              {zone.totalCount}
            </div>
          </Marker>
        ))}
        {selectedZone && (
          <Popup
            {...GOONG_POPUP_DEFAULT_PROPS}
            latitude={selectedZone.latitude}
            longitude={selectedZone.longitude}
            closeButton
            closeOnClick={false}
            onClose={() => setSelectedZoneId(null)}
          >
            <div className="flex flex-col gap-1">
              <strong>{selectedZone.zoneName}</strong>
              <span>
                {selectedZone.totalCount} ô · {selectedZone.availableCount} còn trống
              </span>
              <Button label="Xem sơ đồ" onPress={() => onViewZoneDiagram(selectedZone.zoneId)} />
            </div>
          </Popup>
        )}
      </MapGL>

      {error !== null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center">
          <div className="pointer-events-auto flex items-center gap-sm rounded-md border border-border bg-card px-sm py-xs shadow-md">
            <span className="text-body-sm text-error">
              {error instanceof SideApiError || error instanceof Error ? error.message : 'Không tải được dữ liệu.'}
            </span>
            <button type="button" className="text-body-sm font-semibold text-indigo" onClick={onRetry}>
              Thử lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
