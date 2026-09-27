import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Tooltip,
  ZoomControl,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { palette } from '@/theme';
import { MapBaseLayers } from '@/features/sidewalk-slots/components/MapBaseLayers';
import { DEFAULT_CENTER } from '@/features/sidewalk-slots/map-constants';
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

const statusColor: Record<WardSlot['status'], string> = {
  AVAILABLE: palette.light.tertiary,
  PENDING_APPLICATION: '#C98A04',
  ACTIVE: palette.light.indigo,
  SUSPENDED: palette.light.muted,
};

const round = (value: number) => Math.round(value * 1e6) / 1e6;

function ClickToPick({ onMapClick }: Pick<Props, 'onMapClick'>) {
  useMapEvents({
    click: (e) => onMapClick({ latitude: round(e.latlng.lat), longitude: round(e.latlng.lng) }),
  });
  return null;
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
  const first = slots[0] ?? features[0];
  const center: [number, number] = first ? [first.latitude, first.longitude] : DEFAULT_CENTER;
  return (
    <div className="h-80 overflow-hidden rounded-sm border border-border sm:h-[28rem]">
      <MapContainer
        center={center}
        zoom={18}
        zoomControl={false}
        style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
      >
        <ZoomControl position="bottomright" />
        <MapBaseLayers />
        <ClickToPick onMapClick={onMapClick} />

        {features.map((f) => (
          <CircleMarker
            key={`f-${f.featureId}`}
            center={[f.latitude, f.longitude]}
            radius={7}
            pathOptions={{
              color: f.blocksBusiness ? '#B42318' : '#C98A04',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Tooltip>
              {featureTypeLabels[f.featureType]}: {f.label}
              {f.blocksBusiness ? ' · cấm kinh doanh' : ''}
            </Tooltip>
          </CircleMarker>
        ))}
        {features
          .filter((f) => f.clearanceMeters)
          .map((f) => (
            <Circle
              key={`c-${f.featureId}`}
              center={[f.latitude, f.longitude]}
              radius={f.clearanceMeters!}
              pathOptions={{ color: '#B42318', weight: 1, dashArray: '4 4', fillOpacity: 0.05 }}
            />
          ))}

        {slots.map((s) => (
          <CircleMarker
            key={`s-${s.slotId}`}
            center={[s.latitude, s.longitude]}
            radius={s.slotId === selectedSlotId ? 10 : 7}
            eventHandlers={{ click: () => onSelectSlot(s) }}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: statusColor[s.status],
              fillOpacity: 1,
            }}
          >
            <Tooltip>
              {s.slotCode} · {slotStatusLabels[s.status]}
            </Tooltip>
          </CircleMarker>
        ))}

        {pins.length === 2 && (
          <Polyline
            positions={pins.map((p) => [p.latitude, p.longitude])}
            pathOptions={{ color: palette.light.primary, dashArray: '6 6' }}
          />
        )}
        {pins.map((p, i) => (
          <CircleMarker
            key={`p-${i}`}
            center={[p.latitude, p.longitude]}
            radius={9}
            pathOptions={{
              color: '#fff',
              weight: 3,
              fillColor: palette.light.primary,
              fillOpacity: 1,
            }}
          />
        ))}
        {candidates.map((c) => (
          <CircleMarker
            key={`b-${c.index}`}
            center={[c.latitude, c.longitude]}
            radius={5}
            pathOptions={{
              color: c.issues.some((i) => i.severity === 'BLOCK')
                ? '#B42318'
                : c.issues.length
                  ? '#C98A04'
                  : palette.light.tertiary,
              fillOpacity: 0.8,
            }}
          >
            <Tooltip>{c.proposedCode}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
