import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

import { Icon, Money } from '@/components/common';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { colors } from '@/theme';
import { env } from '@/core/config/env';
import { VendorConnection } from '@/core/auth/VendorConnection';
import { sideApi, useVendorApiSession, SideApiError, type SidewalkSlot } from '@/core/api/side-api';

type Filter = 'ALL' | 'AVAILABLE';
type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// Đường Nguyễn Văn Linh, phường Nam Dương, Hải Châu -- the one pilot area
// seeded with slots placed on the real street centerline (geocoded), rather
// than the older Hoà Quý seed data's approximate in-block points.
const DEFAULT_CENTER: [number, number] = [16.0607, 108.2155];
const DEFAULT_SPAN = 0.004;
const SEARCH_ZOOM = 18;

function markerIcon(status: string) {
  const color =
    status === 'AVAILABLE' ? colors.tertiary : status === 'SUSPENDED' ? colors.primary : colors.muted;
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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

export function SlotMapScreen() {
  return (
    <VendorConnection>
      <SlotMapContent />
    </VendorConnection>
  );
}

function SlotMapContent() {
  const navigate = useNavigate();
  const generation = useVendorApiSession((s) => s.generation);
  const mapRef = useRef<LeafletMap | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [bounds, setBounds] = useState<Bounds>({
    minLat: DEFAULT_CENTER[0] - DEFAULT_SPAN,
    maxLat: DEFAULT_CENTER[0] + DEFAULT_SPAN,
    minLng: DEFAULT_CENTER[1] - DEFAULT_SPAN,
    maxLng: DEFAULT_CENTER[1] + DEFAULT_SPAN,
  });

  const slots = useQuery({
    queryKey: ['side', generation, 'slots', bounds],
    queryFn: () => sideApi.searchSlots({ ...bounds, take: 200 }),
    placeholderData: (previous) => previous,
  });

  const filtered = useMemo(
    () =>
      (slots.data ?? []).filter((s: SidewalkSlot) => (filter === 'ALL' ? true : s.slotStatus === 'AVAILABLE')),
    [slots.data, filter],
  );

  const searchMatches = useMemo(() => {
    const list = slots.data ?? [];
    const q = query.trim().toLowerCase();
    // No query yet: suggest the first few slots in view instead of an empty box.
    if (!q) return list.slice(0, 5);
    return list
      .filter((s) => s.slotCode.toLowerCase().includes(q) || s.zoneName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [slots.data, query]);

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
        <BoundsWatcher onChange={setBounds} />
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
        {filtered.map((slot) => (
          <Marker
            key={slot.slotId}
            position={[slot.latitude, slot.longitude]}
            icon={markerIcon(slot.slotStatus)}
            eventHandlers={{ click: () => navigate(`/vendor/slots/${slot.slotId}`) }}
          >
            <Popup>
              <div className="flex flex-col gap-1">
                <strong>{slot.slotCode}</strong>
                <Money amountVnd={slot.pricePerDay} />
                <StatusChip code={slot.slotStatus} />
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
              { value: 'ALL', label: 'Tất cả', count: slots.data?.length ?? 0 },
              {
                value: 'AVAILABLE',
                label: 'Còn trống',
                count: (slots.data ?? []).filter((s) => s.slotStatus === 'AVAILABLE').length,
              },
            ]}
          />
        </div>
      </div>

      {slots.error && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center">
          <div className="pointer-events-auto flex items-center gap-sm rounded-md border border-border bg-card px-sm py-xs shadow-md">
            <span className="text-body-sm text-error">
              {slots.error instanceof SideApiError ? slots.error.message : slots.error.message}
            </span>
            <button
              type="button"
              className="text-body-sm font-semibold text-indigo"
              onClick={() => void slots.refetch()}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
