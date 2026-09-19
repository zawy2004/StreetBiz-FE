import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  LayerGroup,
  LayersControl,
  Marker,
  Popup,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button, Icon } from '@/components/common';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { colors } from '@/theme';
import { env } from '@/core/config/env';
import { SideApiError, type SidewalkSlot } from '@/core/api/side-api';
import { DEFAULT_CENTER } from '../map-constants';

export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };
type Filter = 'ALL' | 'AVAILABLE';

const SEARCH_ZOOM = 18;

// The street-strip diagram (SIDE-01) already shows every slot in a zone at
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
  const mapRef = useRef<LeafletMap | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => slots.filter((s) => (filter === 'ALL' ? true : s.slotStatus === 'AVAILABLE')),
    [slots, filter],
  );

  const zoneGroups = useMemo<ZoneGroup[]>(() => {
    const byZone = new Map<number, { zoneName: string; slots: SidewalkSlot[] }>();
    for (const s of filtered) {
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
  }, [filtered]);

  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    // No query yet: suggest the first few slots in view instead of an empty box.
    if (!q) return slots.slice(0, 5);
    return slots
      .filter((s) => s.slotCode.toLowerCase().includes(q) || s.zoneName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [slots, query]);

  const goToSlot = (slot: SidewalkSlot) => {
    mapRef.current?.flyTo([slot.latitude, slot.longitude], SEARCH_ZOOM);
    setQuery('');
  };

  return (
    <div className="relative h-full min-h-0 w-full">
      <MapContainer
        ref={mapRef}
        center={DEFAULT_CENTER}
        zoom={17}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ResizeFix />
        <ZoomControl position="bottomright" />
        <BoundsWatcher onChange={onBoundsChange} />
        <LayersControl position="bottomright">
          {/* tile.openstreetmap.org is unreachable on this network, and CARTO's
              anonymous basemap tiles now require a (free) API key -- see
              VITE_CARTO_API_KEY in .env.example. Without a key, fall back to
              Esri's World Street Map, which needs no key at all. */}
          <LayersControl.BaseLayer checked name="Bản đồ đường phố">
            {env.cartoApiKey ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${env.cartoApiKey}`}
                subdomains="abcd"
                maxZoom={20}
              />
            ) : (
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            )}
          </LayersControl.BaseLayer>
          {/* Esri's World Imagery is unlabelled raw imagery -- stack its own
              boundaries/places/roads reference layer on top so street names
              still show up over the satellite photo. */}
          <LayersControl.BaseLayer name="Ảnh vệ tinh">
            <LayerGroup>
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                attribution="Labels &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
            </LayerGroup>
          </LayersControl.BaseLayer>
        </LayersControl>
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-sm p-sm">
        <div className="pointer-events-auto w-72 max-w-[70vw] overflow-hidden rounded-md border border-border bg-card shadow-md">
          <div className="flex items-center gap-xs px-sm py-xs">
            <Icon name="magnify" size={18} color={colors.muted} />
            <input
              className="w-full bg-transparent text-body-sm text-text outline-none"
              placeholder="Tìm theo mã ô hoặc khu vực"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {searchMatches.length > 0 && (
            <div className="max-h-64 overflow-y-auto border-t border-border">
              {searchMatches.map((slot) => (
                <button
                  key={slot.slotId}
                  type="button"
                  className="flex w-full items-center justify-between gap-sm px-sm py-xs text-left hover:bg-bg"
                  onClick={() => goToSlot(slot)}
                >
                  <span className="min-w-0 flex-1 truncate text-body-sm text-text">
                    {slot.slotCode}
                    <span className="ml-1 text-muted">· {slot.zoneName}</span>
                  </span>
                  <StatusChip code={slot.slotStatus} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-auto rounded-md border border-border bg-card p-1 shadow-md">
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'Tất cả', count: slots.length },
              {
                value: 'AVAILABLE',
                label: 'Còn trống',
                count: slots.filter((s) => s.slotStatus === 'AVAILABLE').length,
              },
            ]}
          />
        </div>
      </div>

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
