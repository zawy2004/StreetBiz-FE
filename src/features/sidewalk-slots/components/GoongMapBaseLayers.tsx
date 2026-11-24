import { useState } from 'react';
import GoongMapGL, { Marker, NavigationControl, Popup } from '@goongmaps/goong-map-react';

import { env } from '@/core/config/env';
import { useIsDark } from '@/store/theme-store';

export type MapLayerMode = 'street' | 'satellite';

/**
 * `@goongmaps/goong-map-react` is a react-map-gl v5 fork: every component (the map
 * itself, `Marker`, `Popup`, `NavigationControl`...) relies on its own
 * `Component.defaultProps` -- support React dropped for function components in React
 * 19. Without them e.g. `MapGL`'s `getCursor` throws on mount, and `Popup`'s missing
 * `anchor` throws inside its positioning code the moment a marker is clicked. Spread
 * the matching constant first on every element (before your own props) to restore the
 * library's intended defaults.
 */
function defaultsOf(component: unknown): Record<string, unknown> {
  // `MapGL` is a plain forwardRef, whose own `.defaultProps` holds them -- but
  // `Marker`/`Popup`/`NavigationControl` are `React.memo(...)`-wrapped, and memo never
  // copies the inner component's `.defaultProps` onto the wrapper; they only exist on
  // `.type.defaultProps` (the component memo() was called with).
  const c = component as {
    defaultProps?: Record<string, unknown>;
    type?: { defaultProps?: Record<string, unknown> };
  };
  return c.defaultProps ?? c.type?.defaultProps ?? {};
}
export const GOONG_MAP_DEFAULT_PROPS = defaultsOf(GoongMapGL);
export const GOONG_MARKER_DEFAULT_PROPS = defaultsOf(Marker);
export const GOONG_POPUP_DEFAULT_PROPS = defaultsOf(Popup);
export const GOONG_NAV_CONTROL_DEFAULT_PROPS = defaultsOf(NavigationControl);

/**
 * Goong has no keyless tile, unlike CARTO/Esri before it -- without a maptiles key
 * (see VITE_GOONG_MAPTILES_KEY in .env.example) every map on this screen falls back
 * to Esri's keyless raster tiles instead of failing to render.
 *
 * Goong ships a real dark style rather than a light one -- unlike Leaflet, goong-js
 * draws every layer onto one shared canvas, so a CSS dark-mode filter can no longer
 * target "street only" the way it could target Leaflet's separate tile panes.
 */
const GOONG_STREET_STYLE = 'https://tiles.goong.io/assets/goong_map_web.json';
const GOONG_STREET_STYLE_DARK = 'https://tiles.goong.io/assets/goong_map_dark.json';

/**
 * Esri has real tiles up to z19 over Đà Nẵng; from z20 it serves a grey "Map data not yet
 * available" placeholder. Capping the sources here makes the map scale the z19 tiles up when the
 * user zooms in further, instead of tiling the screen with placeholders.
 */
const ESRI_MAX_ZOOM = 19;

/**
 * Fonts for map-drawn labels (slot codes, street names in 3D). The raster styles have no text of
 * their own, but declaring the same glyphs as the 3D style lets the map switch between them
 * without rebuilding everything, and keeps a label layer valid in either.
 */
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

/**
 * Esri's World Imagery is unlabelled raw imagery -- stack its own boundaries/places/
 * roads reference layer on top so street names still show up over the satellite photo.
 * Built as a literal style (not a URL) since goong-js/Mapbox GL renders any style
 * object the same way it renders a hosted one.
 */
const ESRI_SATELLITE_STYLE = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: ESRI_MAX_ZOOM,
      attribution: 'Tiles &copy; Esri',
    },
    'esri-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: ESRI_MAX_ZOOM,
      attribution: 'Labels &copy; Esri',
    },
  },
  layers: [
    { id: 'esri-imagery', type: 'raster', source: 'esri-imagery' },
    { id: 'esri-labels', type: 'raster', source: 'esri-labels' },
  ],
} as const;

/** Esri's World Street Map -- the keyless fallback for when there is no Goong maptiles key. */
const ESRI_STREET_STYLE = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    'esri-street': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: ESRI_MAX_ZOOM,
      attribution: 'Tiles &copy; Esri',
    },
  },
  layers: [{ id: 'esri-street', type: 'raster', source: 'esri-street' }],
} as const;

function streetStyle(isDark: boolean) {
  if (!env.goongMaptilesKey) return ESRI_STREET_STYLE; // Esri has no dark variant; stays light either way.
  return isDark ? GOONG_STREET_STYLE_DARK : GOONG_STREET_STYLE;
}

function styleFor(mode: MapLayerMode, isDark: boolean) {
  return mode === 'satellite' ? ESRI_SATELLITE_STYLE : streetStyle(isDark);
}

/**
 * The street / satellite base styles every slot map shares, so the slot picker and
 * the location picker look the same. Returns the active Goong/Mapbox GL style and a
 * small switcher control to drop inside the map as an absolutely-positioned child
 * (goong-js has no Leaflet-style LayersControl of its own).
 */
export function useMapBaseLayer(): [
  mapStyle: object | string,
  layerSwitcher: React.ReactNode,
  mode: MapLayerMode,
  isDark: boolean,
  setMode: (mode: MapLayerMode) => void,
] {
  const [mode, setMode] = useState<MapLayerMode>('street');
  const isDark = useIsDark();

  const layerSwitcher = (
    <div
      style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 1 }}
      className="overflow-hidden rounded-sm border border-border bg-card text-body-sm shadow-md"
    >
      {(
        [
          ['street', 'Bản đồ đường phố'],
          ['satellite', 'Ảnh vệ tinh'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          className={`block w-full px-sm py-xs text-left ${mode === value ? 'bg-tint-primary font-semibold text-primary' : 'text-text'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return [styleFor(mode, isDark), layerSwitcher, mode, isDark, setMode];
}
