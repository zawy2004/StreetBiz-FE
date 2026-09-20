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

export const LOCATE_MESSAGES: Record<LocateFailure, string> = {
  UNAVAILABLE: 'Trình duyệt không hỗ trợ định vị.',
  DENIED: 'Chưa được cấp quyền định vị. Hãy cho phép rồi thử lại.',
  FAILED: 'Không lấy được vị trí. Thử lại sau.',
};
