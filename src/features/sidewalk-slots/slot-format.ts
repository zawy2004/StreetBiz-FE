/** Display formatting for the slot workspace. Pure; the clock is always a parameter. */

/** 16.060558 -> 16°03'38.0"N. Hemisphere letters are for WGS84 lat/lng. */
function toDmsPart(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 60 * 10) / 10;
  let carriedDegrees = degrees;
  // Rounding the seconds can land on 60.0; carry instead of printing 60.0".
  if (seconds >= 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes = 0;
    carriedDegrees += 1;
  }
  return `${carriedDegrees}°${String(minutes).padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}"${hemisphere}`;
}

export function toDms(latitude: number, longitude: number): string {
  return `${toDmsPart(latitude, 'N', 'S')} ${toDmsPart(longitude, 'E', 'W')}`;
}

/** Whole seconds left until `expiresAt`, never negative. */
export function secondsUntil(expiresAt: string, nowMs: number): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - nowMs) / 1000));
}

/** 754 -> "12:34". */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** The vendor-facing code shown next to the name. Derived, not stored. */
export function hkdCode(registrationId: number): string {
  return `HKD-${String(registrationId).padStart(4, '0')}`;
}

/** "05:00:00" -> "05:00". */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatHours(from: string | null, to: string | null): string {
  return from && to ? `${formatTime(from)} – ${formatTime(to)}` : 'Cả ngày';
}

/** "1.8 × 2.5 m", or null when either side is unknown (never guessed). */
export function formatSize(width: number | null, length: number | null): string | null {
  if (width == null || length == null) return null;
  return `${fmt(width)} × ${fmt(length)} m`;
}

export function formatAreaSqm(width: number | null, length: number | null): string | null {
  if (width == null || length == null) return null;
  return `${fmt(width * length)} m²`;
}

function fmt(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

/**
 * "Còn 6 ngày" / "Hết hạn hôm nay" / "Đã hết hạn" for a yyyy-mm-dd deadline.
 * The deadline day itself still counts as open.
 */
export function deadlineText(deadline: string, nowMs: number): string {
  const end = Date.parse(`${deadline}T23:59:59`);
  if (Number.isNaN(end)) return '';
  if (end < nowMs) return 'Đã hết hạn nộp hồ sơ';
  const days = Math.ceil((end - nowMs) / 86_400_000) - 1;
  return days <= 0 ? 'Hạn nộp hồ sơ: hôm nay' : `Hạn nộp hồ sơ: còn ${days} ngày`;
}

/** 30000 -> "30k". Whole thousands only; the exact figure is on the detail panel. */
export function formatShortVnd(amount: number): string {
  if (amount >= 1000) return `${Math.round(amount / 1000).toLocaleString('vi-VN')}k`;
  return String(amount);
}
