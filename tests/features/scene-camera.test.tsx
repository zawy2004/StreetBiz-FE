import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@goongmaps/goong-map-react', () => ({ LinearInterpolator: class {} }));

const { useSceneCamera, SCENE_PITCH, SCENE_MIN_ZOOM, prefersReducedMotion } =
  await import('@/features/sidewalk-slots/useSceneCamera');

const START = { latitude: 16.0609, longitude: 108.2177, zoom: 17 };
const ROW = [
  { latitude: 16.0609, longitude: 108.2177 },
  { latitude: 16.0609, longitude: 108.2187 },
];

/** Frames are run by hand: each `step(ms)` advances the clock and runs the queued frame. */
let frames: FrameRequestCallback[] = [];
let now = 0;
function step(ms: number) {
  now += ms;
  const queued = frames;
  frames = [];
  act(() => queued.forEach((cb) => cb(now)));
}

function reducedMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  frames = [];
  now = 0;
  reducedMotion(false);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = [];
  });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('3D scene camera', () => {
  it('starts flat and north-up', () => {
    const { result } = renderHook(() => useSceneCamera(START));
    expect(result.current.viewport).toEqual({ ...START, pitch: 0, bearing: 0 });
    expect(result.current.flying).toBe(false);
  });

  it('tilts into 3D with the street across the screen, close enough to read a slot, and back', () => {
    const { result } = renderHook(() => useSceneCamera(START));

    act(() => result.current.tilt(true, 30));
    expect(result.current.viewport).toMatchObject({
      pitch: SCENE_PITCH,
      bearing: 120,
      zoom: SCENE_MIN_ZOOM,
    });
    expect(result.current.transitionProps.transitionDuration).toBeGreaterThan(0);
    act(() => result.current.transitionProps.onTransitionEnd());
    expect(result.current.transitionProps.transitionDuration).toBe(0);

    act(() => result.current.tilt(false, 30));
    expect(result.current.viewport).toMatchObject({ pitch: 0, bearing: 0 });
    // No street known: north stays up.
    act(() => result.current.tilt(true, null));
    expect(result.current.viewport.bearing).toBe(0);
  });

  it('zooms one step within its limits, re-centres, and turns back to north', () => {
    const { result } = renderHook(() => useSceneCamera(START));

    act(() => result.current.zoomBy(1, 17.5));
    expect(result.current.viewport.zoom).toBe(17.5);
    act(() => result.current.zoomBy(-20, 22));
    expect(result.current.viewport.zoom).toBe(3);

    act(() => result.current.centreOn({ latitude: 16.07, longitude: 108.23 }, 18));
    expect(result.current.viewport).toMatchObject({ latitude: 16.07, longitude: 108.23, zoom: 18 });

    act(() => result.current.tilt(true, 45));
    act(() => result.current.resetNorth());
    expect(result.current.viewport.bearing).toBe(0);
    expect(result.current.viewport.pitch).toBe(SCENE_PITCH);
  });

  it('flies the length of the street facing the way of travel, then stops at the far end', () => {
    const { result } = renderHook(() => useSceneCamera(START));

    let started = false;
    act(() => {
      started = result.current.fly(ROW, 90);
    });
    expect(started).toBe(true);
    expect(result.current.flying).toBe(true);

    step(16);
    expect(result.current.viewport).toMatchObject({ pitch: SCENE_PITCH, bearing: 90 });
    const westEnd = result.current.viewport.longitude;
    step(3_000);
    expect(result.current.viewport.longitude).toBeGreaterThan(westEnd);
    step(60_000);
    expect(result.current.flying).toBe(false);
    expect(frames).toHaveLength(0);
  });

  it('hands the camera back when the user moves the map mid-flight', () => {
    const { result } = renderHook(() => useSceneCamera(START));
    act(() => {
      result.current.fly(ROW, 90);
    });
    step(16);

    act(() =>
      result.current.onUserMove({ latitude: 1, longitude: 2, zoom: 15, pitch: 10, bearing: 5 }),
    );

    expect(result.current.flying).toBe(false);
    expect(result.current.viewport).toEqual({
      latitude: 1,
      longitude: 2,
      zoom: 15,
      pitch: 10,
      bearing: 5,
    });
  });

  it('can be stopped, and never flies for a reduced-motion user or with nothing to fly', () => {
    const { result } = renderHook(() => useSceneCamera(START));
    act(() => {
      result.current.fly(ROW, 90);
    });
    act(() => result.current.stopFlight());
    expect(result.current.flying).toBe(false);

    let started = true;
    act(() => {
      started = result.current.fly([], 90);
    });
    expect(started).toBe(false);

    reducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    act(() => {
      started = result.current.fly(ROW, 90);
    });
    expect(started).toBe(false);
    // Tilting still happens, without the animation.
    act(() => result.current.tilt(true, 0));
    expect(result.current.transitionProps.transitionDuration).toBe(0);
  });
});
