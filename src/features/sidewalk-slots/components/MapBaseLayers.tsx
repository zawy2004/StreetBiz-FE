import { LayerGroup, LayersControl, TileLayer } from 'react-leaflet';

import { env } from '@/core/config/env';

/**
 * The street / satellite base maps every slot map shares, so the slot picker and the
 * location picker look the same.
 *
 * tile.openstreetmap.org is unreachable on this network, and CARTO's anonymous basemap
 * tiles now require a (free) API key -- see VITE_CARTO_API_KEY in .env.example. Without a
 * key, fall back to Esri's World Street Map, which needs no key at all.
 */
export function MapBaseLayers() {
  return (
    <LayersControl position="bottomright">
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
  );
}
