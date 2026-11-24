import { useContext, useEffect, useState } from 'react';
import { _MapContext as MapContext, Layer, Source } from '@goongmaps/goong-map-react';

import type {
  ObstacleBlockProps,
  SceneCollection,
  SlotBlockProps,
  SlotPinProps,
} from '@/features/sidewalk-slots/slot-scene';

/** The layer a tap on a raised slot is read from (`interactiveLayerIds`). */
export const SLOT_BLOCK_LAYER = 'scene-slot-blocks';
/** The round pin over each slot in 3D; tappable like the block under it. */
export const SLOT_PIN_LAYER = 'scene-slot-pins';

// Layers that only belong to 3D (or 2D) stay on the map and are hidden rather than removed: the
// map swaps its whole style when the view switches, and a layer removed in the same moment
// is already gone ("does not exist in the map's style and cannot be removed").
const SHOWN = { visibility: 'visible' } as const;
const HIDDEN = { visibility: 'none' } as const;

type Polygons<P> = SceneCollection<{ type: 'Polygon'; coordinates: [number, number][][] }, P>;
type PinPoints = SceneCollection<{ type: 'Point'; coordinates: [number, number] }, SlotPinProps>;

/**
 * 3D only: a round pin in the slot's status colour over every block, the same size at any tilt
 * and zoom, and from zoom 18 the slot code beside it. Drawn by the map (no DOM markers), so
 * panning moves them with the map instead of re-laying a hundred HTML elements.
 */
export function SlotPins({ data, visible = true }: { data: PinPoints; visible?: boolean }) {
  // A text layer added while the map is still swapping in a style without fonts is rejected;
  // wait until the current style declares its glyphs.
  const { map } = useContext(MapContext) as {
    map?: {
      getStyle?: () => { glyphs?: string } | undefined;
      on: (e: string, f: () => void) => void;
      off: (e: string, f: () => void) => void;
    };
  };
  const [hasGlyphs, setHasGlyphs] = useState(false);
  useEffect(() => {
    if (!map) return;
    // Sticky: every style this map uses declares glyphs, so once seen the label layer stays
    // mounted (dropping it mid style-swap would race the swap, like any other removal).
    const check = () => {
      try {
        if (map.getStyle?.()?.glyphs) setHasGlyphs(true);
      } catch {
        // The style is being replaced; ask again on the next styledata.
      }
    };
    check();
    map.on('styledata', check);
    return () => map.off('styledata', check);
  }, [map]);

  return (
    <Source id="scene-slot-pin-points" type="geojson" data={data}>
      <Layer
        id={SLOT_PIN_LAYER}
        type="circle"
        layout={visible ? SHOWN : HIDDEN}
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 4, 18, 7, 21, 10],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': ['case', ['get', 'selected'], 3, 2],
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        }}
      />
      {hasGlyphs && (
        <Layer
          id="scene-slot-codes"
          type="symbol"
          minzoom={18}
          layout={{
            visibility: visible ? 'visible' : 'none',
            'text-field': ['get', 'slotCode'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 12,
            'text-anchor': 'left',
            'text-offset': [1.1, 0],
            'text-allow-overlap': false,
            'text-optional': true,
          }}
          paint={{
            'text-color': '#111C2B',
            'text-halo-color': 'rgba(255,255,255,0.95)',
            'text-halo-width': 1.6,
          }}
        />
      )}
    </Source>
  );
}

// Layer styles are module constants: a new paint object every render makes the map re-apply it.
const FOOTING_PAINT = { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.9 };
const BLOCK_PAINT = {
  'fill-extrusion-color': ['get', 'color'],
  'fill-extrusion-height': ['get', 'height'],
  'fill-extrusion-base': 0,
  'fill-extrusion-opacity': 0.95,
  'fill-extrusion-vertical-gradient': true,
};
const PAD_PAINT = { 'fill-color': ['get', 'color'], 'fill-opacity': 0.22 };
const EDGE_PAINT = {
  'line-color': ['get', 'color'],
  'line-width': ['case', ['get', 'selected'], 2.5, 1.2],
};

/**
 * The slots as their real, turned rectangles: raised blocks in 3D, painted outlines in 2D (from
 * zoom 17, where a 2 m slot is big enough to read as a shape rather than a speck).
 *
 * The layers are passed as an array, never wrapped in a fragment: <Source> hands its `source` id
 * to its direct children, and a fragment would swallow it (the map then rejects the layers).
 */
export function SlotBlocks({ data, raised }: { data: Polygons<SlotBlockProps>; raised: boolean }) {
  const in3d = raised ? SHOWN : HIDDEN;
  const in2d = raised ? HIDDEN : SHOWN;
  return (
    <Source id="scene-slots" type="geojson" data={data}>
      {[
        <Layer
          key="pads"
          id="scene-slot-pads"
          type="fill"
          minzoom={17}
          layout={in2d}
          paint={PAD_PAINT}
        />,
        <Layer
          key="edges"
          id="scene-slot-edges"
          type="line"
          minzoom={17}
          layout={in2d}
          paint={EDGE_PAINT}
        />,
        // A crisp footing under each block, so its outline reads even where its walls are thin.
        <Layer
          key="footing"
          id="scene-slot-footing"
          type="line"
          layout={in3d}
          paint={FOOTING_PAINT}
        />,
        <Layer
          key="blocks"
          id={SLOT_BLOCK_LAYER}
          type="fill-extrusion"
          layout={in3d}
          paint={BLOCK_PAINT}
        />,
      ]}
    </Source>
  );
}

/** Street features as small blocks (a pole is thin and tall, a hydrant short), 3D only. */
export function ObstacleBlocks({
  data,
  visible = true,
}: {
  data: Polygons<ObstacleBlockProps>;
  visible?: boolean;
}) {
  return (
    <Source id="scene-obstacles" type="geojson" data={data}>
      <Layer
        id="scene-obstacle-blocks"
        type="fill-extrusion"
        layout={visible ? SHOWN : HIDDEN}
        paint={{
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.95,
        }}
      />
    </Source>
  );
}

type Points = SceneCollection<{ type: 'Point'; coordinates: [number, number] }, { weight: number }>;

/** Where the street is taken: warm where slots are rented, faint where they stand open. */
export function OccupancyHeat({ data }: { data: Points }) {
  return (
    <Source id="scene-heat" type="geojson" data={data}>
      <Layer
        id="scene-heat-layer"
        type="heatmap"
        paint={{
          'heatmap-weight': ['get', 'weight'],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 14, 14, 17, 30, 20, 90],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 14, 0.7, 20, 1.6],
          'heatmap-opacity': 0.72,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(253,230,138,0)',
            0.25,
            'rgba(253,230,138,0.65)',
            0.55,
            '#F59E0B',
            0.85,
            '#DC2626',
            1,
            '#7F1D1D',
          ],
        }}
      />
    </Source>
  );
}
