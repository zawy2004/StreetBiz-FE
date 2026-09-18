import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Icon, Money } from '@/components/common';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { colors } from '@/theme';
import { VendorConnection } from '@/core/auth/VendorConnection';
import { sideApi, useVendorApiSession, SideApiError, type SidewalkSlot } from '@/core/api/side-api';

type Filter = 'ALL' | 'AVAILABLE';
type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// Hoà Quý, Ngũ Hành Sơn, Đà Nẵng -- where the seed data's zones and slots are.
const DEFAULT_CENTER: [number, number] = [16.012, 108.24];
const DEFAULT_SPAN = 0.01;
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
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (slots.data ?? []).filter((s) => s.slotCode.toLowerCase().includes(q)).slice(0, 6);
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
        style={{ height: '100%', width: '100%' }}
      >
        <BoundsWatcher onChange={setBounds} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Bản đồ đường phố">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Ảnh vệ tinh">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
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
              placeholder="Tìm theo mã ô (VD: HQ-DH-01)"
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
                  <span className="truncate text-body-sm text-text">{slot.slotCode}</span>
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
