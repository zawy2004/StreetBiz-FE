import MapGL, { Marker, type MapEvent } from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';

import { env } from '@/core/config/env';
import { palette } from '@/theme';
import { DEFAULT_CENTER } from '../map-constants';
import { GOONG_MAP_DEFAULT_PROPS, GOONG_MARKER_DEFAULT_PROPS, useMapBaseLayer } from './GoongMapBaseLayers';

export type PickedPosition = { latitude: number; longitude: number };

type Props = {
  position: PickedPosition | null;
  /** Bump to re-centre the map on `position`, e.g. after the GPS fix; tapping the map never re-centres it. */
  viewKey: number;
  onPick: (position: PickedPosition) => void;
};

// Six decimals is about 10 cm, which is all the database column keeps.
const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** A map where a tap places the pin; it starts on the pilot area until there is a position. */
export function LocationPicker({ position, viewKey, onPick }: Props) {
  const [mapStyle, layerSwitcher] = useMapBaseLayer();

  return (
    <div className="location-picker-map h-60 overflow-hidden rounded-sm border border-border">
      <MapGL
        {...GOONG_MAP_DEFAULT_PROPS}
        key={viewKey}
        latitude={position ? position.latitude : DEFAULT_CENTER[0]}
        longitude={position ? position.longitude : DEFAULT_CENTER[1]}
        zoom={position ? 18 : 15}
        width="100%"
        height="100%"
        mapStyle={mapStyle}
        goongApiAccessToken={env.goongMaptilesKey}
        onClick={(event: MapEvent) => onPick({ latitude: round(event.lngLat[1]), longitude: round(event.lngLat[0]) })}
      >
        {layerSwitcher}
        {position && (
          <Marker
            {...GOONG_MARKER_DEFAULT_PROPS}
            latitude={position.latitude}
            longitude={position.longitude}
            offsetLeft={-9}
            offsetTop={-9}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: palette.light.primary,
                border: '3px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,.4)',
              }}
            />
          </Marker>
        )}
      </MapGL>
    </div>
  );
}
