import { CircleMarker, MapContainer, ZoomControl, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { palette } from '@/theme';
import { DEFAULT_CENTER } from '../map-constants';
import { MapBaseLayers } from './MapBaseLayers';

export type PickedPosition = { latitude: number; longitude: number };

type Props = {
  position: PickedPosition | null;
  /** Bump to re-centre the map on `position`, e.g. after the GPS fix; tapping the map never re-centres it. */
  viewKey: number;
  onPick: (position: PickedPosition) => void;
};

// Six decimals is about 10 cm, which is all the database column keeps.
const round = (value: number) => Math.round(value * 1e6) / 1e6;

function TapToPick({ onPick }: Pick<Props, 'onPick'>) {
  useMapEvents({
    click: (event) => onPick({ latitude: round(event.latlng.lat), longitude: round(event.latlng.lng) }),
  });
  return null;
}

/** A map where a tap places the pin; it starts on the pilot area until there is a position. */
export function LocationPicker({ position, viewKey, onPick }: Props) {
  return (
    <div className="h-60 overflow-hidden rounded-sm border border-border">
      <MapContainer
        key={viewKey}
        center={position ? [position.latitude, position.longitude] : DEFAULT_CENTER}
        zoom={position ? 18 : 15}
        zoomControl={false}
        style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
      >
        <ZoomControl position="bottomright" />
        <MapBaseLayers />
        <TapToPick onPick={onPick} />
        {position && (
          <CircleMarker
            center={[position.latitude, position.longitude]}
            radius={9}
            pathOptions={{ color: '#fff', weight: 3, fillColor: palette.light.primary, fillOpacity: 1 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
