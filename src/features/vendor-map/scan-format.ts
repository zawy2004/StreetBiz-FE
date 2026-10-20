import { statusLabel } from '@/core/constants/status-labels';
import type { StatusTone } from '@/theme';
import { daysUntil } from './vendor-profile-format';

/**
 * The tone of a public permit check. A valid result takes its status's tone;
 * an invalid one is never shown green or grey (it was always drawn as an error),
 * so ok/neutral become danger.
 */
export function passTone(status: string, isValid: boolean): StatusTone {
  const { tone } = statusLabel(status);
  if (isValid) return tone;
  return tone === 'ok' || tone === 'neutral' ? 'danger' : tone;
}

/** The verdict in words: the status's label, or "Không hợp lệ" when an invalid result carries a valid-looking status. */
export function passVerdict(status: string, isValid: boolean): string {
  const { label, tone } = statusLabel(status);
  if (!isValid && (tone === 'ok' || tone === 'neutral') && label !== status) return 'Không hợp lệ';
  return label;
}

/** One plain sentence for a buyer, by tone. */
export function passSentence(tone: StatusTone, slotCode: string | null): string | null {
  if (tone === 'ok') {
    return slotCode
      ? `Quán đang có giấy phép bán ở ô ${slotCode}.`
      : 'Quán đang có giấy phép còn hiệu lực.';
  }
  if (tone === 'pending') return 'Giấy phép chưa đến ngày có hiệu lực.';
  if (tone === 'danger') return 'Giấy phép này không còn hiệu lực.';
  return null;
}

/** Days left on the permit, by the Vietnam calendar (see `daysUntil`). */
export const daysLeft = (validUntil: string | null | undefined, now: Date = new Date()) =>
  daysUntil(validUntil, now);

type Point = { latitude: number; longitude: number };

/** Great-circle distance in metres (haversine). */
export function distanceBetween(a: Point, b: Point): number {
  const R = 6_371_000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Where today sits between the two dates, 0..1; null when either date is missing or unreadable. */
export function validityProgress(
  validFrom: string | null | undefined,
  validUntil: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!validFrom || !validUntil) return null;
  const from = new Date(validFrom).getTime();
  const until = new Date(validUntil).getTime();
  if (Number.isNaN(from) || Number.isNaN(until) || until <= from) return null;
  return Math.min(Math.max((now.getTime() - from) / (until - from), 0), 1);
}
