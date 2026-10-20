import { useQuery } from '@tanstack/react-query';

import { formatVnd } from '@/components/common';
import { useAuthStore } from '@/store/auth-store';
import type { MapPoint } from '../../SlotGridMap';
import { wardConfigApi, type PlacementIssue, type WardZone } from '../../../ward-config-api';

export type GridMode = 'slot' | 'batch' | 'feature';

export type GpsFix = MapPoint & { accuracy: number };

/** Metres beyond which a phone GPS fix is too loose to pin a 2 m slot on. */
export const GPS_ACCURACY_WARN_METERS = 15;

/** What the batch panel has measured between its two pins, for the tape label on the map. */
export type RulerInfo = { meters: number; slots: number | null; tooShort: boolean };

export const sizeValue = (text: string) => {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 999.99 ? n : null;
};

export function hasBlock(issues: PlacementIssue[]) {
  return issues.some((i) => i.severity === 'BLOCK');
}

export function usePlacementCheck(
  zoneId: number,
  point: MapPoint | null,
  width: number | null,
  length: number | null,
  ignoreSlotId?: number,
) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: [
      'ward',
      userId,
      'placement',
      zoneId,
      point?.latitude,
      point?.longitude,
      width,
      length,
      ignoreSlotId,
    ],
    queryFn: () =>
      wardConfigApi.checkPlacement(
        {
          zoneId,
          latitude: point!.latitude,
          longitude: point!.longitude,
          widthMeters: width!,
          lengthMeters: length!,
        },
        ignoreSlotId,
      ),
    enabled: !!point && width != null && length != null,
  });
}

/** Segment length as the batch panel prints it: one decimal under 10 m, whole metres above. */
export function formatSegment(meters: number) {
  return meters < 10 ? meters.toFixed(1) : String(Math.round(meters));
}

/** The tape-measure label drawn halfway along the two batch pins. */
export function rulerText(ruler: RulerInfo) {
  const length = `${formatSegment(ruler.meters)} m`;
  if (ruler.tooShort) return `${length} · ngắn hơn 1 ô`;
  if (ruler.slots != null) return `${length} · khoảng ${ruler.slots} ô`;
  return length;
}

/** Ring colour around the officer's GPS fix: red once it is too loose to pin a slot on. */
export function accuracyColor(accuracy: number) {
  return accuracy > GPS_ACCURACY_WARN_METERS ? '#B42318' : '#1A73E8';
}

const hhmm = (time: string) => time.slice(0, 5);

/** "30.000 đ/ngày · 05:00–22:00" from the zone already loaded for the filter. */
export function zoneMeta(zone: WardZone) {
  const price =
    zone.priceDisplayUnit === 'MONTH' && zone.pricePerMonth != null
      ? `${formatVnd(zone.pricePerMonth)}/tháng`
      : `${formatVnd(zone.pricePerDay)}/ngày`;
  const hours =
    zone.availableFrom && zone.availableTo
      ? `${hhmm(zone.availableFrom)}–${hhmm(zone.availableTo)}${zone.isOvernight ? ' (qua đêm)' : ''}`
      : null;
  return hours ? `${price} · ${hours}` : price;
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
