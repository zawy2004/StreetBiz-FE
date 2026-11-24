import type { RailButton } from './components/MapRail';
import type { MapLayerMode } from './components/GoongMapBaseLayers';

/** The zoom range every 2D map allows (Esri's imagery stops at z19; z20 scales it up). */
export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 20;

export const clampZoom = (zoom: number, max = MAP_MAX_ZOOM) =>
  Math.min(max, Math.max(MAP_MIN_ZOOM, zoom));

/**
 * The tool rail every plain (2D) map shares: street map / satellite, then zoom in and out.
 * Each map adds its own buttons around these (3D, heat, orbit...).
 */
export function baseMapRail({
  mode,
  onMode,
  onZoom,
}: {
  mode?: MapLayerMode;
  onMode?: (mode: MapLayerMode) => void;
  onZoom: (delta: 1 | -1) => void;
}): RailButton[][] {
  const layers: RailButton[] =
    mode && onMode
      ? [
          {
            label: mode === 'satellite' ? 'Về bản đồ đường phố' : 'Xem ảnh vệ tinh',
            icon: 'satellite',
            pressed: mode === 'satellite',
            onPress: () => onMode(mode === 'satellite' ? 'street' : 'satellite'),
          },
        ]
      : [];
  return [
    layers,
    [
      { label: 'Phóng to', icon: 'plus', onPress: () => onZoom(1) },
      { label: 'Thu nhỏ', icon: 'minus', onPress: () => onZoom(-1) },
    ],
  ];
}
