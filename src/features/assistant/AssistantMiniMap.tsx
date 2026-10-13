import { useMemo, useState } from 'react';
import MapGL, { Marker } from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';
import { env } from '@/core/config/env';
import {
  GOONG_MAP_DEFAULT_PROPS,
  GOONG_MARKER_DEFAULT_PROPS,
  useMapBaseLayer,
} from '@/features/sidewalk-slots/components/GoongMapBaseLayers';
import type { VendorResult } from './AssistantVendorResults';
import type { AssistantLocation } from './types';

type Viewport = { latitude: number; longitude: number; zoom: number };

/** Up to 8 public stall pins; choosing a pin opens the same quick preview as the list. */
export default function AssistantMiniMap({
  results,
  here,
  onSelect,
}: {
  results: VendorResult[];
  here?: AssistantLocation;
  onSelect: (route: string, trigger: HTMLButtonElement) => void;
}) {
  const [mapStyle] = useMapBaseLayer();
  const initial = useMemo<Viewport>(() => {
    const points: AssistantLocation[] = results.map((r) => ({ latitude: r.card.place!.latitude, longitude: r.card.place!.longitude }));
    if (here) points.push(here);
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
    return {
      latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
      longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2,
      zoom: spread < 0.004 ? 16 : spread < 0.015 ? 15 : spread < 0.05 ? 13 : 11,
    };
  }, [results, here]);
  const [viewport, setViewport] = useState(initial);
  return (
    <div className="sb-mini-map" aria-label="Bản đồ các quầy gợi ý">
      <MapGL
        {...GOONG_MAP_DEFAULT_PROPS}
        {...viewport}
        width="100%"
        height="100%"
        mapStyle={mapStyle}
        goongApiAccessToken={env.goongMaptilesKey}
        onViewportChange={(v: Viewport) => setViewport({ latitude: v.latitude, longitude: v.longitude, zoom: v.zoom })}
      >
        {here && (
          <Marker {...GOONG_MARKER_DEFAULT_PROPS} latitude={here.latitude} longitude={here.longitude} offsetLeft={-8} offsetTop={-8}>
            <span className="sb-pin-me" aria-label="Vị trí của bạn" />
          </Marker>
        )}
        {results.map((result, index) => (
          <Marker
            {...GOONG_MARKER_DEFAULT_PROPS}
            key={result.route}
            latitude={result.card.place!.latitude}
            longitude={result.card.place!.longitude}
            offsetLeft={-16}
            offsetTop={-34}
          >
            <button
              type="button"
              className={`sb-pin ${result.card.place!.isOpenNow ? 'is-open' : ''}`}
              aria-label={`Xem nhanh ${result.card.title} trên bản đồ`}
              onClick={(e) => onSelect(result.route, e.currentTarget)}
            >
              {index + 1}
            </button>
          </Marker>
        ))}
      </MapGL>
    </div>
  );
}
