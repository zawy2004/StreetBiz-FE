import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearInterpolator } from '@goongmaps/goong-map-react';

import { easeInOut, flightDurationMs, lerpPoint, streetSpan, type GeoPoint } from './slot-3d';

export type SceneViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

/**
 * Options for creating a 3D-capable map. goong-js creates its WebGL context without
 * antialiasing, which leaves the edges of raised blocks jagged; this is read once, when the map
 * is created.
 */
export const SCENE_MAP_OPTIONS = { antialias: true } as const;

/** How close a 3D map may zoom: the vector base stays sharp to z22; Esri imagery stops at z19. */
export const SCENE_MAX_ZOOM = 22;

/** The tilt of the 3D view (the map library's maximum). */
export const SCENE_PITCH = 60;
/** Close enough in 3D that a 2 m slot reads as a block. */
export const SCENE_MIN_ZOOM = 18.5;
const FLIGHT_ZOOM = 19.6;
const TILT_MS = 900;

/**
 * The map rotation that lays a street across the screen (left to right), so both kerbs are in
 * view: the camera faces at right angles to the street.
 */
export function overviewBearing(streetBearing: number | null): number {
  if (streetBearing == null) return 0;
  return (streetBearing + 90) % 360;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * The camera of a 3D slot map: the controlled viewport, the animated tilt between 2D and 3D, and
 * the flight down the street. A user who drags the map during a flight takes the camera back.
 */
export function useSceneCamera(initial: Pick<SceneViewport, 'latitude' | 'longitude' | 'zoom'>) {
  const [viewport, setViewport] = useState<SceneViewport>({ ...initial, pitch: 0, bearing: 0 });
  const [transitionMs, setTransitionMs] = useState(0);
  const [flying, setFlying] = useState(false);
  const frame = useRef(0);
  const interpolator = useMemo(() => new LinearInterpolator(), []);

  const stopFlight = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    setFlying(false);
  }, []);
  useEffect(() => stopFlight, [stopFlight]);

  /** Into 3D (tilted, the street across the screen) or back to the flat map, north up. */
  const tilt = useCallback(
    (raised: boolean, streetBearing: number | null) => {
      stopFlight();
      setTransitionMs(prefersReducedMotion() ? 0 : TILT_MS);
      setViewport((v) => ({
        ...v,
        pitch: raised ? SCENE_PITCH : 0,
        bearing: raised ? overviewBearing(streetBearing) : 0,
        zoom: raised ? Math.max(v.zoom, SCENE_MIN_ZOOM) : v.zoom,
      }));
    },
    [stopFlight],
  );

  /** Re-centre without changing tilt or rotation (address search, GPS). */
  const centreOn = useCallback((point: GeoPoint, minZoom: number) => {
    setTransitionMs(0);
    setViewport((v) => ({ ...v, ...point, zoom: Math.max(v.zoom, minZoom) }));
  }, []);

  /**
   * Fly along the street the points stand on, facing the way of travel, then stop at the far
   * end. false when there is nothing to fly (no points); a reduced-motion user is never flown.
   */
  const fly = useCallback(
    (points: readonly GeoPoint[], streetBearing: number) => {
      const span = streetSpan(points, streetBearing);
      if (!span || prefersReducedMotion() || typeof requestAnimationFrame !== 'function')
        return false;
      stopFlight();
      setTransitionMs(0);
      setFlying(true);
      const duration = flightDurationMs(span.lengthMeters);
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        setViewport({
          ...lerpPoint(span.start, span.end, easeInOut(t)),
          zoom: FLIGHT_ZOOM,
          pitch: SCENE_PITCH,
          bearing: streetBearing,
        });
        if (t < 1) frame.current = requestAnimationFrame(step);
        else {
          frame.current = 0;
          setFlying(false);
        }
      };
      frame.current = requestAnimationFrame(step);
      return true;
    },
    [stopFlight],
  );

  /** The +/- buttons: one zoom step, animated, within the map's limits. */
  const zoomBy = useCallback(
    (delta: number, maxZoom: number) => {
      stopFlight();
      setTransitionMs(prefersReducedMotion() ? 0 : 250);
      setViewport((v) => ({ ...v, zoom: Math.min(maxZoom, Math.max(3, v.zoom + delta)) }));
    },
    [stopFlight],
  );

  /** Turn the map back to north-up, keeping the tilt. */
  const resetNorth = useCallback(() => {
    stopFlight();
    setTransitionMs(prefersReducedMotion() ? 0 : 400);
    setViewport((v) => ({ ...v, bearing: 0 }));
  }, [stopFlight]);

  /** For the map's onViewportChange: the user moved the map (and so ends any flight). */
  const onUserMove = useCallback(
    (v: SceneViewport) => {
      if (frame.current) stopFlight();
      setViewport({
        latitude: v.latitude,
        longitude: v.longitude,
        zoom: v.zoom,
        pitch: v.pitch ?? 0,
        bearing: v.bearing ?? 0,
      });
    },
    [stopFlight],
  );

  const transitionProps = {
    transitionDuration: transitionMs,
    transitionInterpolator: interpolator,
    onTransitionEnd: () => setTransitionMs(0),
  };

  return {
    viewport,
    transitionProps,
    flying,
    tilt,
    fly,
    stopFlight,
    centreOn,
    zoomBy,
    resetNorth,
    onUserMove,
  };
}
