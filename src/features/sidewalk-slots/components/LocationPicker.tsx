import { useEffect, useState } from 'react';
import MapGL, { Marker, type MapEvent } from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';

import { env } from '@/core/config/env';
import { palette } from '@/theme';
import { DEFAULT_CENTER } from '../map-constants';
import { baseMapRail, clampZoom } from '../map-rail';
import {
  GOONG_MAP_DEFAULT_PROPS,
  GOONG_MARKER_DEFAULT_PROPS,
  useMapBaseLayer,
} from './GoongMapBaseLayers';
import { MapRail } from './MapRail';

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
type Viewport = { latitude: number; longitude: number; zoom: number };

const viewOf = (position: PickedPosition | null): Viewport => ({
  latitude: position ? position.latitude : DEFAULT_CENTER[0],
  longitude: position ? position.longitude : DEFAULT_CENTER[1],
  zoom: position ? 18 : 16,
});

export function LocationPicker({ position, viewKey, onPick }: Props) {
  const [mapStyle, , layerMode, , setLayerMode] = useMapBaseLayer();
  const [viewport, setViewport] = useState<Viewport>(() => viewOf(position));
  // A new key (GPS fix, address search) re-centres on the position; a tap never does.
  useEffect(() => {
    setViewport(viewOf(position));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);
  const rail = baseMapRail({
    mode: layerMode,
    onMode: setLayerMode,
    onZoom: (d) => setViewport((v) => ({ ...v, zoom: clampZoom(v.zoom + d) })),
  });

  return (
    <div className="location-picker-map relative h-[300px] overflow-hidden rounded-[16px] md:h-[380px] xl:h-[420px]">
      <MapGL
        {...GOONG_MAP_DEFAULT_PROPS}
        {...viewport}
        width="100%"
        height="100%"
        onViewportChange={(v: Viewport) =>
          setViewport({ latitude: v.latitude, longitude: v.longitude, zoom: v.zoom })
        }
        mapStyle={mapStyle}
        goongApiAccessToken={env.goongMaptilesKey}
        onClick={(event: MapEvent) =>
          onPick({ latitude: round(event.lngLat[1]), longitude: round(event.lngLat[0]) })
        }
      >
        {position && (
          <Marker
            {...GOONG_MARKER_DEFAULT_PROPS}
            latitude={position.latitude}
            longitude={position.longitude}
            offsetLeft={-11}
            offsetTop={-46}
          >
            {/* A survey stake, striped orange and white with a flag; it drops in each time it moves. */}
            <div
              key={`${position.latitude},${position.longitude}`}
              className="sb-pop relative h-[48px] w-[22px]"
              style={{ filter: 'drop-shadow(0 3px 3px rgba(17,28,43,.35))' }}
            >
              <span
                aria-hidden="true"
                className="sb-ping absolute -bottom-3 -left-px h-6 w-6 rounded-full"
                style={{ background: 'rgb(255 106 31 / 0.35)' }}
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 22 48"
                width="22"
                height="48"
                className="relative"
              >
                <path
                  d="M11 3 L21 7.5 L11 12 Z"
                  fill={palette.light.brand}
                  stroke={palette.light.primary}
                  strokeWidth="1"
                />
                <rect
                  x="9"
                  y="3"
                  width="4"
                  height="41"
                  rx="1.5"
                  fill="#fff"
                  stroke={palette.light.primary}
                  strokeWidth="1"
                />
                {[8, 18, 28].map((y) => (
                  <rect key={y} x="9.5" y={y} width="3" height="5" fill={palette.light.brand} />
                ))}
                <ellipse cx="11" cy="45.5" rx="6" ry="2" fill="rgba(17,28,43,.3)" />
              </svg>
            </div>
          </Marker>
        )}
      </MapGL>
      <div className="pointer-events-none absolute right-sm top-sm z-[2]">
        <MapRail groups={rail} />
      </div>
    </div>
  );
}
