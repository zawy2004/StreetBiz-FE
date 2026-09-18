import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { EmptyState, ErrorState } from '@/components/feedback';
import { colors } from '@/theme';
import { VendorConnection } from '@/core/auth/VendorConnection';
import { sideApi, useVendorApiSession, SideApiError, type SidewalkSlot } from '@/core/api/side-api';

type Filter = 'ALL' | 'AVAILABLE';
type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// Hoà Quý, Ngũ Hành Sơn, Đà Nẵng -- where the seed data's zones and slots are.
const DEFAULT_CENTER: [number, number] = [16.012, 108.24];
const DEFAULT_SPAN = 0.01;

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
  const [filter, setFilter] = useState<Filter>('ALL');
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

  return (
    <Screen>
      <AppHeader title="Ô vỉa hè" subtitle="Kéo hoặc thu phóng bản đồ để tìm ô quanh khu vực" />
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
      <div className="h-[60vh] min-h-[320px] overflow-hidden rounded-md border border-border">
        <MapContainer center={DEFAULT_CENTER} zoom={17} style={{ height: '100%', width: '100%' }}>
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
      </div>
      {slots.error && (
        <ErrorState
          message={slots.error instanceof SideApiError ? slots.error.message : slots.error.message}
          onRetry={() => void slots.refetch()}
        />
      )}
      {!slots.isPending && !slots.error && filtered.length === 0 && (
        <EmptyState icon="map-marker-outline" title="Không có ô phù hợp trong khu vực đang xem" />
      )}
    </Screen>
  );
}
