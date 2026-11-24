import { describe, expect, it, vi } from 'vitest';

import {
  baseMapRail,
  clampZoom,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from '@/features/sidewalk-slots/map-rail';

describe('baseMapRail', () => {
  it('offers satellite then zoom, and flips the layer mode', () => {
    const onMode = vi.fn();
    const onZoom = vi.fn();
    const [layers, zoom] = baseMapRail({ mode: 'street', onMode, onZoom });

    expect(layers!.map((b) => b.label)).toEqual(['Xem ảnh vệ tinh']);
    expect(layers![0]!.pressed).toBe(false);
    layers![0]!.onPress();
    expect(onMode).toHaveBeenCalledWith('satellite');

    expect(zoom!.map((b) => b.label)).toEqual(['Phóng to', 'Thu nhỏ']);
    zoom![0]!.onPress();
    zoom![1]!.onPress();
    expect(onZoom.mock.calls).toEqual([[1], [-1]]);
  });

  it('says how to go back from satellite', () => {
    const [layers] = baseMapRail({ mode: 'satellite', onMode: vi.fn(), onZoom: vi.fn() });
    expect(layers![0]).toMatchObject({ label: 'Về bản đồ đường phố', pressed: true });
  });

  it('leaves the layer switch out of a map that has only one base (zoom only)', () => {
    const [layers, zoom] = baseMapRail({ onZoom: vi.fn() });
    expect(layers).toEqual([]);
    expect(zoom).toHaveLength(2);
  });

  it('keeps zoom within the maps limits', () => {
    expect(clampZoom(25)).toBe(MAP_MAX_ZOOM);
    expect(clampZoom(1)).toBe(MAP_MIN_ZOOM);
    expect(clampZoom(17.5)).toBe(17.5);
    expect(clampZoom(23, 22)).toBe(22);
  });
});
