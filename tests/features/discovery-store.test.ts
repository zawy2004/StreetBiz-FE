import { vi } from 'vitest';

import { NO_DISCOVERY_FILTERS } from '@/features/buyer-discovery/discovery-filters';
import { useDiscoveryStore } from '@/features/buyer-discovery/discovery-store';
import { detectPosition, LocateError } from '@/features/buyer-discovery/geolocation';

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (error: { code: number }) => void;

function stubGeolocation(getCurrentPosition: (ok: Success, fail: Failure) => void) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
}

const reset = () => {
  sessionStorage.clear();
  useDiscoveryStore.setState({ position: null, locateStatus: 'IDLE', filters: NO_DISCOVERY_FILTERS });
};

describe('detectPosition', () => {
  it('resolves with the coordinates the browser reports', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 16.06, longitude: 108.21 } }));

    await expect(detectPosition()).resolves.toEqual({ latitude: 16.06, longitude: 108.21 });
  });

  it('tells a refused permission from any other failure', async () => {
    stubGeolocation((_, fail) => fail({ code: 1 }));
    await expect(detectPosition()).rejects.toMatchObject({ reason: 'DENIED' });

    stubGeolocation((_, fail) => fail({ code: 3 }));
    await expect(detectPosition()).rejects.toMatchObject({ reason: 'FAILED' });
  });

  it('rejects when the browser has no geolocation', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });

    await expect(detectPosition()).rejects.toBeInstanceOf(LocateError);
    await expect(detectPosition()).rejects.toMatchObject({ reason: 'UNAVAILABLE' });
  });
});

describe('useDiscoveryStore', () => {
  beforeEach(reset);

  it('keeps the detected position and reports the outcome', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 16.06, longitude: 108.21 } }));

    await useDiscoveryStore.getState().locate();

    expect(useDiscoveryStore.getState()).toMatchObject({
      position: { latitude: 16.06, longitude: 108.21 },
      locateStatus: 'OK',
    });
  });

  it('records why locating failed and keeps no position', async () => {
    stubGeolocation((_, fail) => fail({ code: 1 }));

    await useDiscoveryStore.getState().locate();

    expect(useDiscoveryStore.getState()).toMatchObject({ position: null, locateStatus: 'DENIED' });
  });

  it('ignores a second locate request while one is running', async () => {
    const getCurrentPosition = vi.fn();
    stubGeolocation(getCurrentPosition);

    void useDiscoveryStore.getState().locate();
    void useDiscoveryStore.getState().locate();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(useDiscoveryStore.getState().locateStatus).toBe('LOCATING');
  });

  it('drops the radius together with the position', () => {
    useDiscoveryStore.setState({
      position: { latitude: 16.06, longitude: 108.21 },
      locateStatus: 'OK',
      filters: { ...NO_DISCOVERY_FILTERS, radiusMeters: 2000, wardId: 3 },
    });

    useDiscoveryStore.getState().clearPosition();

    expect(useDiscoveryStore.getState()).toMatchObject({
      position: null,
      locateStatus: 'IDLE',
      filters: { radiusMeters: null, wardId: 3 },
    });
  });

  it('clears the chip filters but keeps the chosen service area', () => {
    useDiscoveryStore.getState().setFilters({ wardId: 3, categoryId: 2, openNow: true, maxPrice: 30_000 });

    useDiscoveryStore.getState().resetFilters();

    expect(useDiscoveryStore.getState().filters).toEqual({ ...NO_DISCOVERY_FILTERS, wardId: 3 });
  });

  it('never writes the position to storage', () => {
    useDiscoveryStore.setState({ position: { latitude: 16.06, longitude: 108.21 } });
    useDiscoveryStore.getState().setFilters({ wardId: 3 });

    const stored = sessionStorage.getItem('streetbiz-discovery') ?? '';
    expect(stored).toContain('"wardId":3');
    expect(stored).not.toContain('16.06');
  });
});
