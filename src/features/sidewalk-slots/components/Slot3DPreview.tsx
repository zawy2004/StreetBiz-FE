import { useEffect, useMemo, useState } from 'react';
import MapGL, { Marker } from '@goongmaps/goong-map-react';
import '@goongmaps/goong-js/dist/goong-js.css';
import { useQuery } from '@tanstack/react-query';

import { sideApi, type SidewalkSlot } from '@/core/api/side-api';
import { useIsDark } from '@/store/theme-store';
import { fitStreetBearing } from '../slot-3d';
import {
  sceneStyle,
  slotBlocks,
  slotPins,
  type SceneSlot,
  type SceneSlotStatus,
} from '../slot-scene';
import {
  overviewBearing,
  prefersReducedMotion,
  SCENE_MAP_OPTIONS,
  SCENE_MAX_ZOOM,
  SCENE_PITCH,
  useSceneCamera,
} from '../useSceneCamera';
import { GOONG_MAP_DEFAULT_PROPS, GOONG_MARKER_DEFAULT_PROPS } from './GoongMapBaseLayers';
import { MapRail } from './MapRail';
import { SlotBlocks, SlotPins } from './SceneLayers';

const STATUSES: readonly SceneSlotStatus[] = [
  'AVAILABLE',
  'PENDING_APPLICATION',
  'ACTIVE',
  'SUSPENDED',
];

const asStatus = (status: string): SceneSlotStatus =>
  (STATUSES as readonly string[]).includes(status) ? (status as SceneSlotStatus) : 'AVAILABLE';

const toScene = (s: SidewalkSlot): SceneSlot => ({
  slotId: s.slotId,
  zoneId: s.zoneId,
  slotCode: s.slotCode,
  status: asStatus(s.slotStatus),
  latitude: s.latitude,
  longitude: s.longitude,
  widthMeters: s.widthMeters,
  lengthMeters: s.lengthMeters,
  bearingDegrees: s.bearingDegrees ?? null,
});

/** How far the camera swings either side of the street view while nobody touches it. */
const ORBIT_DEGREES = 28;
const ORBIT_PERIOD_MS = 14_000;

/**
 * The vendor's look at a slot before applying: the slot (orange) among its neighbours on the
 * same street, raised in 3D with the buildings and house numbers around it, the camera slowly
 * swinging so the place reads like a photo. Touching the map stops the swing.
 */
export function Slot3DPreview({ slot }: { slot: SidewalkSlot }) {
  const isDark = useIsDark();
  const zone = useQuery({
    queryKey: ['side', 'zone-slots', slot.zoneId],
    queryFn: () => sideApi.searchSlots({ zoneId: slot.zoneId }),
    staleTime: 60_000,
  });
  const neighbours = useMemo(() => {
    const list = zone.data ?? [];
    return list.some((s) => s.slotId === slot.slotId) ? list : [...list, slot];
  }, [zone.data, slot]);
  const scene = useMemo(() => neighbours.map(toScene), [neighbours]);
  const streetBearing = useMemo(() => fitStreetBearing(scene), [scene]);
  const bearings = useMemo(
    () => new Map(streetBearing == null ? [] : [[slot.zoneId, streetBearing]]),
    [streetBearing, slot.zoneId],
  );
  const blocks = useMemo(
    () => slotBlocks(scene, bearings, { selectedId: slot.slotId }),
    [scene, bearings, slot.slotId],
  );

  // This slot's code is on its own orange tag; the map label would only repeat it.
  const pins = useMemo(
    () => slotPins(scene, { selectedId: slot.slotId, unlabelledId: slot.slotId }),
    [scene, slot.slotId],
  );
  // The camera swings every frame; a style built per render would reload the map each frame.
  const style = useMemo(() => sceneStyle('street', isDark), [isDark]);

  const camera = useSceneCamera({ latitude: slot.latitude, longitude: slot.longitude, zoom: 19 });
  const { tilt } = camera;
  const [orbiting, setOrbiting] = useState(!prefersReducedMotion());

  // Tilt into the street view once the street is known.
  useEffect(() => {
    tilt(true, streetBearing);
  }, [tilt, streetBearing]);

  // The slow swing: a sine around the street view, until the user takes the camera.
  const [swing, setSwing] = useState(0);
  useEffect(() => {
    if (!orbiting || typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      setSwing(Math.sin(((now - started) / ORBIT_PERIOD_MS) * 2 * Math.PI) * ORBIT_DEGREES);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [orbiting]);

  const viewport = orbiting
    ? {
        ...camera.viewport,
        latitude: slot.latitude,
        longitude: slot.longitude,
        pitch: SCENE_PITCH,
        bearing: overviewBearing(streetBearing) + swing,
      }
    : camera.viewport;

  return (
    <div className="relative h-[300px] overflow-hidden rounded-[16px] ring-1 ring-border md:h-[340px]">
      <MapGL
        {...GOONG_MAP_DEFAULT_PROPS}
        {...viewport}
        {...(orbiting ? {} : camera.transitionProps)}
        maxPitch={60}
        maxZoom={SCENE_MAX_ZOOM}
        mapOptions={SCENE_MAP_OPTIONS}
        width="100%"
        height="100%"
        mapStyle={style}
        onViewportChange={(v: typeof viewport) => {
          setOrbiting(false);
          camera.onUserMove(v);
        }}
      >
        <SlotBlocks data={blocks} raised />
        <SlotPins data={pins} />
        <Marker {...GOONG_MARKER_DEFAULT_PROPS} latitude={slot.latitude} longitude={slot.longitude}>
          <span className="pointer-events-none block -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-[8px] bg-brand px-2 py-0.5 font-tabular text-[12px] font-bold text-white shadow-card">
            {slot.slotCode}
          </span>
        </Marker>
      </MapGL>
      {/* Key on the left, tools on the right edge: they never share a row. */}
      <p className="pointer-events-none absolute left-sm top-sm max-w-[calc(100%-76px)] rounded-full bg-card/90 px-sm py-1 text-body-sm text-text shadow-card ring-1 ring-border">
        <span className="font-semibold text-brand">■</span> Ô này · khối cao = đã có người thuê
      </p>
      <div className="pointer-events-none absolute right-sm top-sm z-[2]">
        <MapRail
          groups={[
            [
              {
                label: orbiting ? 'Dừng xoay camera' : 'Xoay camera quanh ô',
                icon: orbiting ? 'stop-circle-outline' : 'rotate-right',
                pressed: orbiting,
                onPress: () => setOrbiting((o) => !o),
              },
            ],
            [
              { label: 'Phóng to', icon: 'plus', onPress: () => camera.zoomBy(1, SCENE_MAX_ZOOM) },
              { label: 'Thu nhỏ', icon: 'minus', onPress: () => camera.zoomBy(-1, SCENE_MAX_ZOOM) },
            ],
          ]}
        />
      </div>
      {zone.isError && (
        <p className="absolute inset-x-sm bottom-sm rounded-[10px] bg-card/95 px-sm py-1 text-body-sm text-muted shadow-card">
          Không tải được các ô bên cạnh; chỉ hiện ô này.
        </p>
      )}
    </div>
  );
}
