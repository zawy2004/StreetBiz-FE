import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { errorMessage, ApiError } from '@/core/api';
import { sellerStoreApi, type StoreHours } from '@/core/api/seller-store-api';
import {
  copyDay,
  DAYS,
  DEFAULT_WINDOW,
  describeRentalWindow,
  fromWeek,
  MAX_WINDOWS_PER_DAY,
  sameWeek,
  toWeek,
  validateWeek,
  type Week,
} from '../../hours-view';

/**
 * STORE-03. The weekly opening hours of one storefront: switch a day on, give it up to three
 * windows, copy a day onto others, save the whole week at once. Windows must sit inside the hours
 * the ward rents the pitch for (shown at the top), and a shop with no hours at all simply follows
 * its Đang mở / Tạm dừng switch.
 */
export function BusinessHoursEditor({ storefrontId }: { storefrontId: number }) {
  const hours = useQuery({
    queryKey: ['commerce', 'store-hours', storefrontId],
    queryFn: () => sellerStoreApi.hours(storefrontId),
  });

  if (hours.isPending) {
    return (
      <section aria-label="Giờ mở cửa" className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80">
        <Skeleton className="h-24 w-full" />
      </section>
    );
  }
  if (hours.isError) {
    return (
      <section aria-label="Giờ mở cửa" className="rounded-[20px] bg-card shadow-card ring-1 ring-border/80">
        <ErrorState message={errorMessage(hours.error)} onRetry={() => void hours.refetch()} />
      </section>
    );
  }
  // Keyed on the saved week so the form restarts from the server's copy after every save or reload.
  return (
    <HoursForm key={JSON.stringify(hours.data.hours)} storefrontId={storefrontId} saved={hours.data} />
  );
}

function HoursForm({ storefrontId, saved }: { storefrontId: number; saved: StoreHours }) {
  const cache = useQueryClient();
  const base = toWeek(saved.hours);
  const [week, setWeek] = useState<Week>(base);
  const [copying, setCopying] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);

  const clientErrors = validateWeek(week, saved.allowedWindow);
  const payload = fromWeek(week);
  const dirty = !sameWeek(week, base);

  const save = useMutation({
    mutationFn: () => sellerStoreApi.saveHours(storefrontId, payload.hours),
    onSuccess: async (result) => {
      cache.setQueryData(['commerce', 'store-hours', storefrontId], result);
      await cache.invalidateQueries({ queryKey: ['commerce', 'stores'] });
      showToast('Đã lưu giờ mở cửa');
    },
  });

  // A server complaint about row i of the payload is shown on the line that row came from.
  const serverErrors: Record<string, string> = {};
  if (save.error instanceof ApiError) {
    payload.origin.forEach((o, i) => {
      const message = save.error instanceof ApiError ? save.error.fieldError(`hours[${i}]`) : undefined;
      if (message) serverErrors[`${o.day}.${o.index}`] = message;
    });
  }
  const generalError =
    save.isError && Object.keys(serverErrors).length === 0 ? errorMessage(save.error) : null;
  const lineError = (day: number, index: number) =>
    clientErrors[`${day}.${index}`] ?? serverErrors[`${day}.${index}`];

  const update = (day: number, next: Week[number]) => {
    save.reset();
    setWeek((w) => w.map((windows, i) => (i === day ? next : windows)));
  };

  return (
    <section
      aria-labelledby={`hours-title-${storefrontId}`}
      className="flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <h2 id={`hours-title-${storefrontId}`} className="font-heading text-[18px] font-bold text-text">
            Giờ mở cửa
          </h2>
          <p className="text-body-sm text-muted">
            {saved.hours.length === 0
              ? 'Chưa đặt giờ: gian hàng mở hay đóng theo công tắc Đang mở / Tạm dừng.'
              : 'Người mua chỉ thấy gian hàng là “Đang mở” trong các khung giờ dưới đây.'}
          </p>
        </div>
        <span
          className={`inline-flex h-8 items-center gap-1.5 rounded-full px-sm text-body-sm font-semibold ${
            saved.isOpenNow ? 'bg-tint-tertiary text-tertiary' : 'bg-sunken text-muted'
          }`}
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${saved.isOpenNow ? 'bg-tertiary' : 'bg-muted'}`} />
          {saved.isOpenNow ? 'Đang mở' : 'Đã đóng'}
          <span className="sr-only"> lúc này</span>
        </span>
      </div>

      <p className="flex items-start gap-xs rounded-[12px] bg-sunken/70 px-sm py-xs text-body-sm text-text">
        <Icon name="information-outline" size={18} color="currentColor" className="mt-px shrink-0" />
        <span>
          {saved.allowedWindow
            ? `Khung giờ cho thuê của khu vực: ${describeRentalWindow(saved.allowedWindow)}. Giờ mở cửa phải nằm trong khung này.`
            : 'Khu vực của bạn không giới hạn khung giờ cho thuê.'}{' '}
          Mở đến nửa đêm thì chọn 23:59.
        </span>
      </p>

      <ul className="flex flex-col divide-y divide-border">
        {DAYS.map(({ day, label }, dayIndex) => {
          const windows = week[dayIndex]!;
          const on = windows.length > 0;
          return (
            <li key={day} className="flex flex-col gap-xs py-sm">
              <div className="flex flex-wrap items-center gap-sm">
                <label className="flex min-h-11 w-[120px] shrink-0 cursor-pointer items-center gap-xs text-body-md font-semibold text-text">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      update(dayIndex, e.target.checked ? [{ ...DEFAULT_WINDOW }] : [])
                    }
                    className="h-5 w-5 accent-[rgb(var(--c-primary))]"
                  />
                  {label}
                  <span className="sr-only">{on ? ': có mở cửa' : ': nghỉ'}</span>
                </label>
                {on ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-xs">
                    {windows.map((w, index) => {
                      const error = lineError(dayIndex, index);
                      return (
                        <div key={index} className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-xs">
                            <TimeInput
                              label={`${label}, khung ${index + 1}, giờ mở`}
                              value={w.opensAt}
                              invalid={Boolean(error)}
                              onChange={(value) =>
                                update(dayIndex, windows.map((x, i) => (i === index ? { ...x, opensAt: value } : x)))
                              }
                            />
                            <span aria-hidden="true" className="text-muted">
                              –
                            </span>
                            <TimeInput
                              label={`${label}, khung ${index + 1}, giờ đóng`}
                              value={w.closesAt}
                              invalid={Boolean(error)}
                              onChange={(value) =>
                                update(dayIndex, windows.map((x, i) => (i === index ? { ...x, closesAt: value } : x)))
                              }
                            />
                            <button
                              type="button"
                              aria-label={`Xoá khung ${index + 1} của ${label}`}
                              onClick={() => update(dayIndex, windows.filter((_, i) => i !== index))}
                              className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-text"
                            >
                              <Icon name="close" size={18} color="currentColor" />
                            </button>
                          </div>
                          {error ? (
                            <p role="alert" className="text-body-sm text-error">
                              {error}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap gap-xs">
                      <button
                        type="button"
                        disabled={windows.length >= MAX_WINDOWS_PER_DAY}
                        onClick={() => {
                          const last = windows[windows.length - 1];
                          update(dayIndex, [
                            ...windows,
                            last && last.closesAt < '23:00'
                              ? { opensAt: last.closesAt, closesAt: '23:59' }
                              : { ...DEFAULT_WINDOW },
                          ]);
                        }}
                        className="h-9 rounded-full px-sm text-label font-semibold text-primary hover:bg-tint-primary disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        + Thêm khung giờ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCopying(copying === dayIndex ? null : dayIndex);
                          setCopyTargets([]);
                        }}
                        aria-expanded={copying === dayIndex}
                        className="h-9 rounded-full px-sm text-label font-semibold text-muted hover:bg-sunken hover:text-text"
                      >
                        Sao chép sang ngày khác
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-body-md text-muted">Nghỉ cả ngày</span>
                )}
              </div>
              {copying === dayIndex ? (
                <fieldset className="ml-0 flex flex-wrap items-center gap-sm rounded-[12px] bg-sunken/70 p-sm md:ml-[128px]">
                  <legend className="sr-only">Sao chép giờ của {label} sang</legend>
                  <span className="text-body-sm text-muted">Sao chép sang:</span>
                  {DAYS.filter((d) => d.day !== day).map((d) => (
                    <label key={d.day} className="flex min-h-9 items-center gap-1 text-body-sm text-text">
                      <input
                        type="checkbox"
                        checked={copyTargets.includes(d.day - 1)}
                        onChange={(e) =>
                          setCopyTargets((t) => (e.target.checked ? [...t, d.day - 1] : t.filter((x) => x !== d.day - 1)))
                        }
                      />
                      {d.label}
                    </label>
                  ))}
                  <Button
                    label="Sao chép"
                    size="sm"
                    fullWidth={false}
                    disabled={copyTargets.length === 0}
                    onPress={() => {
                      save.reset();
                      setWeek((w) => copyDay(w, dayIndex, copyTargets));
                      setCopying(null);
                      setCopyTargets([]);
                    }}
                  />
                </fieldset>
              ) : null}
            </li>
          );
        })}
      </ul>

      {generalError ? (
        <p role="alert" className="text-body-sm font-medium text-error">
          {generalError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-sm">
        <Button
          label="Lưu giờ mở cửa"
          fullWidth={false}
          loading={save.isPending}
          disabled={!dirty || Object.keys(clientErrors).length > 0}
          onPress={() => save.mutate()}
        />
        {dirty ? (
          <Button
            label="Hoàn tác"
            variant="outline"
            fullWidth={false}
            onPress={() => {
              save.reset();
              setWeek(base);
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

function TimeInput({
  label,
  value,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="time"
      aria-label={label}
      aria-invalid={invalid || undefined}
      value={value}
      step={60}
      onChange={(e) => onChange(e.target.value)}
      className={`h-11 w-[116px] rounded-[10px] border bg-card px-sm text-body-md font-tabular text-text ${
        invalid ? 'border-error' : 'border-border'
      }`}
    />
  );
}
