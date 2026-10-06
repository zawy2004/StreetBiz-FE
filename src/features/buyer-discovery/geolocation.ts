import type { GeoPoint } from '@/core/api/commerce-api';

export type LocateFailure = 'UNAVAILABLE' | 'DENIED' | 'FAILED';

export class LocateError extends Error {
  constructor(public reason: LocateFailure) {
    super(reason);
  }
}

const PERMISSION_DENIED = 1;

/** Asks the browser for the customer's current position (DISC-01). Rejects with a LocateError. */
export function detectPosition(): Promise<GeoPoint> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new LocateError('UNAVAILABLE'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new LocateError(error.code === PERMISSION_DENIED ? 'DENIED' : 'FAILED')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

/** A position with how sure the device is of it: what the pickup-range check needs. */
export type PositionFix = GeoPoint & { accuracyMeters: number };

/**
 * Follows the customer's position until the returned function is called (ORD-01: distance to the
 * stall while they walk). Never older than 15 s: a cached fix from before they set off would
 * judge the wrong place.
 */
export function watchPositionFix(
  onFix: (fix: PositionFix) => void,
  onError: (reason: LocateFailure) => void,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('UNAVAILABLE');
    return () => undefined;
  }
  // Unsubscribe from the same object that was subscribed to, whatever the global says by then.
  const geolocation = navigator.geolocation;
  const id = geolocation.watchPosition(
    ({ coords }) =>
      onFix({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracy,
      }),
    (error) => onError(error.code === PERMISSION_DENIED ? 'DENIED' : 'FAILED'),
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 },
  );
  return () => geolocation.clearWatch(id);
}

export const LOCATE_MESSAGES: Record<LocateFailure, string> = {
  UNAVAILABLE: 'Trình duyệt không hỗ trợ định vị.',
  DENIED: 'Chưa được cấp quyền định vị. Hãy cho phép rồi thử lại.',
  FAILED: 'Không lấy được vị trí. Thử lại sau.',
};
