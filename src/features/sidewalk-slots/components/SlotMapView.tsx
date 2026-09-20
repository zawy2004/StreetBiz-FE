import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/common';
import { colors } from '@/theme';
import { SideApiError, type SidewalkSlot } from '@/core/api/side-api';
import { DEFAULT_CENTER } from '../map-constants';
import { MapBaseLayers } from './MapBaseLayers';

export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// The corridor plan (SIDE-01) already shows every slot in a zone at
// full detail -- one pin per slot on the map itself was redundant and, at
// city zoom, an unreadable cluster. One badge per zone (total count, green
// once any slot in it is AVAILABLE) says "there's rentable kerb here";
// the popup's "Xem sơ đồ" button is where a vendor actually picks a slot.
function zoneMarkerIcon(count: number, hasAvailable: boolean) {
  const color = hasAvailable ? colors.tertiary : colors.muted;
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);color:white;font-weight:700;font-size:13px;font-family:sans-serif;">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

/**
 * Leaflet measures its container's size once, at mount. Inside a flex layout
 * the container is still 0-height at that instant (the flex pass hasn't run
 * yet), so tiles never load until something nudges Leaflet to remeasure --
 * this watches the container and does that on every resize.
 */
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function BoundsWatcher({ onChange }: { onChange: (bounds: Bounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onChange({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
    },
  });
  return null;
}

type ZoneGroup = {
  zoneId: number;
  zoneName: string;
  center: [number, number];
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
      center: [
        zoneSlots.reduce((sum, s) => sum + s.latitude, 0) / zoneSlots.length,
        zoneSlots.reduce((sum, s) => sum + s.longitude, 0) / zoneSlots.length,
      ],
      totalCount: zoneSlots.length,
      availableCount: zoneSlots.filter((s) => s.slotStatus === 'AVAILABLE').length,
    }));
  }, [slots]);

  return (
    <div className="relative h-full min-h-0 w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={17}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ResizeFix />
        <ZoomControl position="bottomright" />
        <BoundsWatcher onChange={onBoundsChange} />
        <MapBaseLayers />
        {zoneGroups.map((zone) => (
          <Marker
            key={zone.zoneId}
            position={zone.center}
            icon={zoneMarkerIcon(zone.totalCount, zone.availableCount > 0)}
          >
            <Popup>
              <div className="flex flex-col gap-1">
                <strong>{zone.zoneName}</strong>
                <span>
                  {zone.totalCount} ô · {zone.availableCount} còn trống
                </span>
                <Button label="Xem sơ đồ" onPress={() => onViewZoneDiagram(zone.zoneId)} />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

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
