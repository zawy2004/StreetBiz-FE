import type { RoleCode } from '@/core/types/role';

/**
 * Display-only helpers for the platform admin screens. Nothing here changes
 * what is fetched or sent; it only says already-loaded values in words.
 */

/** New dates on these screens are read in the pilot city's time (Asia/Ho_Chi_Minh). */
export const dayFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

export const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** "dd/mm/yyyy" for an ISO string, or null when the value is missing or unreadable. */
export function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dayFormat.format(date);
}

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateTimeFormat.format(date);
}

/** How long something has waited, in the largest whole unit: "35 phút", "5 giờ", "3 ngày". */
export function waitSince(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  const minutes = Math.max(0, Math.floor((now - start) / 60_000));
  if (minutes < 60) return { value: Math.max(1, minutes), unit: 'phút', days: 0 };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { value: hours, unit: 'giờ', days: 0 };
  const days = Math.floor(hours / 24);
  return { value: days, unit: 'ngày', days };
}

export function waitText(iso: string | null | undefined, now?: number): string | null {
  const wait = waitSince(iso, now);
  return wait ? `${wait.value} ${wait.unit}` : null;
}

/** True when animations should be skipped: the user asked for less motion, or there is no browser (tests). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Lowercase, accents off, "đ" to "d": so "tran" finds "Trần". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

/** Role colours for the composition bar and avatar rings. Always paired with words and numbers. */
export const ROLE_ORDER: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

export const ROLE_SWATCH: Record<RoleCode, { bar: string; ring: string; dot: string }> = {
  CUSTOMER: { bar: 'bg-brand', ring: 'ring-brand', dot: 'bg-brand' },
  VENDOR: { bar: 'bg-accent', ring: 'ring-accent', dot: 'bg-accent' },
  WARD_AUTHORITY: { bar: 'bg-tertiary', ring: 'ring-tertiary', dot: 'bg-tertiary' },
  PLATFORM_ADMIN: { bar: 'bg-text', ring: 'ring-text', dot: 'bg-text' },
};
