import type { BusinessHour, RentalWindow } from '@/core/api/seller-store-api';

/** ISO weekdays, Monday first: the order the editor lists them and the server stores them. */
export const DAYS = [
  { day: 1, label: 'Thứ Hai' },
  { day: 2, label: 'Thứ Ba' },
  { day: 3, label: 'Thứ Tư' },
  { day: 4, label: 'Thứ Năm' },
  { day: 5, label: 'Thứ Sáu' },
  { day: 6, label: 'Thứ Bảy' },
  { day: 7, label: 'Chủ nhật' },
] as const;

export const MAX_WINDOWS_PER_DAY = 3;
export const DEFAULT_WINDOW = { opensAt: '08:00', closesAt: '12:00' };

export type Window = { opensAt: string; closesAt: string };
/** Index 0 is Monday; a day with no windows is closed all day. */
export type Week = Window[][];

export const emptyWeek = (): Week => DAYS.map(() => []);

export function toWeek(hours: BusinessHour[]): Week {
  const week = emptyWeek();
  for (const h of hours) {
    week[h.dayOfWeek - 1]?.push({ opensAt: h.opensAt, closesAt: h.closesAt });
  }
  return week.map((day) => [...day].sort((a, b) => a.opensAt.localeCompare(b.opensAt)));
}

/** The payload, and for each row of it where it came from (so a server error can find its line). */
export function fromWeek(week: Week): { hours: BusinessHour[]; origin: { day: number; index: number }[] } {
  const hours: BusinessHour[] = [];
  const origin: { day: number; index: number }[] = [];
  week.forEach((windows, dayIndex) =>
    windows.forEach((w, index) => {
      hours.push({ dayOfWeek: dayIndex + 1, opensAt: w.opensAt, closesAt: w.closesAt });
      origin.push({ day: dayIndex, index });
    }),
  );
  return { hours, origin };
}

export const sameWeek = (a: Week, b: Week) => JSON.stringify(a) === JSON.stringify(b);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Does a window sit inside the hours the ward rents the pitch for? Same rule as the server. */
export function fitsRentalWindow(w: Window, allowed: RentalWindow | null): boolean {
  if (!allowed) return true;
  return allowed.overnight
    ? w.opensAt >= allowed.from || w.closesAt <= allowed.to
    : allowed.from <= w.opensAt && w.closesAt <= allowed.to;
}

export const describeRentalWindow = (allowed: RentalWindow) =>
  `${allowed.from}–${allowed.to}${allowed.overnight ? ' (qua đêm)' : ''}`;

/** Per-line problems, keyed "dayIndex.windowIndex"; an empty object means the week can be saved. */
export function validateWeek(week: Week, allowed: RentalWindow | null): Record<string, string> {
  const errors: Record<string, string> = {};
  week.forEach((windows, dayIndex) => {
    windows.forEach((w, index) => {
      const key = `${dayIndex}.${index}`;
      if (!TIME.test(w.opensAt) || !TIME.test(w.closesAt)) errors[key] = 'Nhập giờ mở và đóng cửa.';
      else if (w.opensAt >= w.closesAt)
        errors[key] =
          'Giờ mở phải trước giờ đóng. Mở đến nửa đêm thì chọn 23:59; ca sau nửa đêm ghi ở ngày kế tiếp.';
      else if (!fitsRentalWindow(w, allowed))
        errors[key] = `Ngoài giờ cho thuê của khu vực (${describeRentalWindow(allowed!)}).`;
    });
    const sorted = windows
      .map((w, index) => ({ ...w, index }))
      .filter((w) => !errors[`${dayIndex}.${w.index}`])
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt));
    for (let n = 1; n < sorted.length; n++) {
      // Windows that only touch (close 12:00, open 12:00) are fine.
      if (sorted[n]!.opensAt < sorted[n - 1]!.closesAt)
        errors[`${dayIndex}.${sorted[n]!.index}`] = 'Chồng lên một khung giờ khác trong ngày.';
    }
  });
  return errors;
}

/** Copies one day's windows onto other days (replacing what they had). */
export function copyDay(week: Week, from: number, to: number[]): Week {
  return week.map((windows, i) =>
    to.includes(i) && i !== from ? week[from]!.map((w) => ({ ...w })) : windows,
  );
}

export const STATUS_TEXT = {
  open: 'Đang mở',
  closed: 'Đã đóng',
} as const;
