import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { FilterChips, PhotoPicker, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { EmptyState, LoadingState, Skeleton, showToast } from '@/components/feedback';
import { errorMessage, vendorRegistrationApi } from '@/core/api';
import { sideApi } from '@/core/api/side-api';
import { reverseGeocode } from '@/services/map/reverse-geocode';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';
import { AddressSearch } from '../components/AddressSearch';
import { Callout } from '../components/Callout';
import { MySlotsTabs } from '../components/MySlotsTabs';
import { hkdCode } from '../slot-format';

// The Goong/mapbox bundle (~885 kB) loads with this screen only, not with every
// screen of this feature's lazy chunk.
const LocationPicker = lazy(() =>
  import('../components/LocationPicker').then((m) => ({ default: m.LocationPicker })),
);

// No zones-list endpoint exists -- a zone only shows up here once it has at
// least one slot to search for. Cast a wide, citywide net (not just the
// Nguyễn Văn Linh pilot bbox) so any configured zone can surface, since the
// whole point of this screen is proposing a slot somewhere new.
const DA_NANG_CENTER = { lat: 16.047, lng: 108.206 };
const DA_NANG_RADIUS_METERS = 20_000;

type Position = { latitude: number; longitude: number };

/** A typed size as metres, or null when it is not a positive number (nothing is validated here). */
const metres = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() && Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * Proposing a slot that is not on the grid yet, as a field survey form: the
 * map is the stage and the pin a striped survey stake; the form sections tick
 * off as they are filled; the bay draws itself as its size is typed.
 */
export function SlotProposalScreen() {
  const navigate = useNavigate();
  const { registrations, isLoading: loadingRegistrations } = useRegistrations();
  const registrationId = registrations[0]?.registrationId;

  const zoneOptions = useQuery({
    queryKey: ['side', 'zones-for-proposal'],
    queryFn: () =>
      sideApi.searchSlots({ ...DA_NANG_CENTER, radiusMeters: DA_NANG_RADIUS_METERS, take: 500 }),
  });
  const zones = useMemo(() => {
    const byZone = new Map<number, string>();
    for (const s of zoneOptions.data ?? []) byZone.set(s.zoneId, s.zoneName);
    return [...byZone.entries()].map(([zoneId, zoneName]) => ({ zoneId, zoneName }));
  }, [zoneOptions.data]);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const activeZoneId = zoneId ?? zones[0]?.zoneId ?? null;

  const [position, setPosition] = useState<Position | null>(null);
  // Only a GPS fix re-centres the map; tapping it to place the pin must not move the view under the finger.
  const [viewKey, setViewKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string>();
  const address = useQuery({
    queryKey: ['side', 'reverse-geocode', position?.latitude, position?.longitude],
    queryFn: ({ signal }) => reverseGeocode(position!.latitude, position!.longitude, signal),
    enabled: !!position,
    staleTime: Infinity,
  });

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setLocateError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setViewKey((key) => key + 1);
        setLocating(false);
      },
      () => {
        setLocateError('Không lấy được vị trí. Hãy cho phép định vị hoặc chạm vào bản đồ để chọn.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const [widthMeters, setWidthMeters] = useState('');
  const [lengthMeters, setLengthMeters] = useState('');
  const [photoFile, setPhotoFile] = useState<File>();
  const [photoUri, setPhotoUri] = useState<string>();
  const [error, setError] = useState<string>();

  const queryClient = useQueryClient();
  const submit = useMutation({
    mutationFn: async () => {
      const { fileUrl } = await vendorRegistrationApi.uploadEvidenceFile(photoFile!);
      return sideApi.proposeSlot({
        registrationId: registrationId!,
        zoneId: activeZoneId!,
        latitude: position!.latitude,
        longitude: position!.longitude,
        widthMeters: widthMeters.trim() ? Number(widthMeters) : undefined,
        lengthMeters: lengthMeters.trim() ? Number(lengthMeters) : undefined,
        proposalPhotoUrl: fileUrl,
      });
    },
    onSuccess: (result) => {
      // The proposal appears as a new pending slot on the zone map and in My slots.
      void queryClient.invalidateQueries({ queryKey: ['side'] });
      showToast(result.message);
      navigate(-1);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  // Display only: slot counts per zone and the zone whose slots sit nearest the stake.
  const zoneStats = useMemo(() => {
    const stats = new Map<number, { count: number; lat: number; lng: number }>();
    for (const s of zoneOptions.data ?? []) {
      const entry = stats.get(s.zoneId) ?? { count: 0, lat: 0, lng: 0 };
      entry.count += 1;
      if (Number.isFinite(s.latitude) && Number.isFinite(s.longitude)) {
        entry.lat += s.latitude;
        entry.lng += s.longitude;
      }
      stats.set(s.zoneId, entry);
    }
    return stats;
  }, [zoneOptions.data]);
  const nearestZone = useMemo(() => {
    if (!position) return null;
    let best: { zoneId: number; d: number } | null = null;
    for (const [id, st] of zoneStats) {
      if (!st.count || (!st.lat && !st.lng)) continue;
      const d = Math.hypot(
        st.lat / st.count - position.latitude,
        st.lng / st.count - position.longitude,
      );
      if (!best || d < best.d) best = { zoneId: id, d };
    }
    return best ? (zones.find((z) => z.zoneId === best.zoneId) ?? null) : null;
  }, [position, zoneStats, zones]);

  if (loadingRegistrations) return <ProposalSkeleton />;
  if (!registrationId) {
    return (
      <Screen>
        <MySlotsTabs />
        <EmptyState
          icon="map-marker-radius-outline"
          title="Cần có hồ sơ đăng ký kinh doanh"
          description="Vui lòng nộp hồ sơ đăng ký trước khi đề xuất ô mới."
          action={
            <Button
              label="Nộp hồ sơ đăng ký"
              fullWidth={false}
              onPress={() => navigate('/vendor/registrations/new/type')}
            />
          }
        />
      </Screen>
    );
  }

  const handleSubmit = () => {
    if (!activeZoneId) return setError('Vui lòng chọn khu vực.');
    if (!position) return setError('Vui lòng chọn vị trí trên bản đồ hoặc lấy vị trí hiện tại.');
    if (!photoFile) return setError('Vui lòng chụp ảnh vị trí.');
    setError(undefined);
    submit.mutate();
  };

  const width = metres(widthMeters);
  const length = metres(lengthMeters);
  const registration = registrations[0];
  const steps = [
    { label: 'Vị trí', done: !!position },
    { label: 'Tuyến', done: activeZoneId != null },
    { label: 'Kích thước', done: width != null && length != null, optional: true },
    { label: 'Ảnh vị trí', done: !!photoFile },
  ];

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi đề xuất" loading={submit.isPending} onPress={handleSubmit} />
        </StickyActions>
      }
    >
      <MySlotsTabs />
      <AppHeader title="Đề xuất ô mới" back subtitle="Dành cho địa chỉ chưa có ô trong lưới" />

      <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          <div className="xl:hidden">
            <ProposalSteps steps={steps} sending={submit.isPending} layout="row" />
          </div>

          <FormSection icon="crosshairs-gps" title="Vị trí đề xuất" required>
            <AddressSearch
              onPick={(match) => {
                setPosition({ latitude: match.latitude, longitude: match.longitude });
                setViewKey((key) => key + 1);
              }}
            />
            {/* The survey sheet: corner ticks, the map, and a sight ring until a stake is placed. */}
            <div className="relative rounded-[20px] bg-card p-1.5 shadow-card ring-1 ring-border">
              <CornerTicks />
              <Suspense
                fallback={
                  <div className="flex h-[300px] items-center justify-center rounded-[16px] bg-sunken md:h-[380px] xl:h-[420px]">
                    <LoadingState label="Đang tải bản đồ" />
                  </div>
                }
              >
                <LocationPicker position={position} viewKey={viewKey} onPick={setPosition} />
              </Suspense>
              {position ? null : (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-xs"
                >
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    <span className="absolute inset-x-[-10px] top-1/2 h-px bg-brand/60" />
                    <span className="absolute inset-y-[-10px] left-1/2 w-px bg-brand/60" />
                  </span>
                  <span className="rounded-full bg-card/90 px-sm py-0.5 text-body-sm font-semibold text-text shadow-card backdrop-blur">
                    Chạm để cắm mốc
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-sm rounded-[16px] bg-card/90 p-sm shadow-card ring-1 ring-border backdrop-blur">
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  position ? 'bg-tint-primary text-primary' : 'bg-sunken text-muted'
                }`}
              >
                <Icon name="map-marker-outline" size={20} color="currentColor" weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-3 text-body-md font-semibold text-text">
                  {!position
                    ? 'Chưa chọn vị trí'
                    : address.isPending
                      ? 'Đang tra địa chỉ…'
                      : (address.data ?? 'Không tra được địa chỉ cho vị trí này')}
                </p>
                {position && (
                  <p className="mt-0.5 font-number font-tabular text-body-sm text-muted">
                    {position.latitude.toFixed(6)}°, {position.longitude.toFixed(6)}°
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body-sm text-muted">
                Hoặc chạm vào bản đồ để đặt và chỉnh lại vị trí ô.
              </p>
              <div className="sm:w-auto sm:shrink-0">
                <Button
                  label="Lấy vị trí hiện tại"
                  variant="outline"
                  loading={locating}
                  onPress={locate}
                  icon={<Icon name="crosshairs-gps" size={18} color="currentColor" />}
                />
              </div>
            </div>
            {locateError ? <Callout tone="danger">{locateError}</Callout> : null}
          </FormSection>

          <FormSection icon="map-outline" title="Khu vực" required>
            {zones.length > 0 ? (
              <>
                <p className="text-body-sm text-muted">Chọn tuyến đường gần vị trí nhất</p>
                <FilterChips
                  value={String(activeZoneId)}
                  onChange={(v) => setZoneId(Number(v))}
                  options={zones.map((z) => ({
                    value: String(z.zoneId),
                    label: z.zoneName,
                    count: zoneStats.get(z.zoneId)?.count,
                  }))}
                />
                {nearestZone ? (
                  <p className="flex items-center gap-1.5 text-body-sm text-text">
                    <Icon
                      name="map-marker-radius-outline"
                      size={16}
                      color="currentColor"
                      className="text-primary"
                    />
                    Gần mốc nhất: <span className="font-semibold">{nearestZone.zoneName}</span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-body-sm text-muted">Đang tải danh sách khu vực…</p>
            )}
          </FormSection>

          <FormSection icon="ruler-square" title="Kích thước ước tính" hint="tuỳ chọn">
            <div className="flex flex-col gap-md md:flex-row md:items-start">
              <div className="grid flex-1 grid-cols-2 gap-sm [&>*]:[container-name:form] [&>*]:[container-type:inline-size]">
                <TextField
                  label="Mặt tiền (m)"
                  value={widthMeters}
                  onChangeText={setWidthMeters}
                  keyboardType="numeric"
                  placeholder="VD: 3.5"
                />
                <TextField
                  label="Chiều sâu (m)"
                  value={lengthMeters}
                  onChangeText={setLengthMeters}
                  keyboardType="numeric"
                  placeholder="VD: 2.0"
                />
              </div>
              <ProposedBayPreview width={width} length={length} />
            </div>
            <p className="text-body-sm text-muted">
              Không bắt buộc. Phường sẽ xác nhận kích thước khi khảo sát.
            </p>
          </FormSection>

          <FormSection
            icon="camera-plus-outline"
            title="Ảnh vị trí"
            required
            badge={
              <span className="rounded-full bg-tint-primary px-xs text-badge uppercase text-primary">
                Bắt buộc
              </span>
            }
          >
            <p className="text-body-sm text-muted">
              Chụp rõ vỉa hè và mặt tiền nhà liền kề (JPG, PNG hoặc WEBP, tối đa 5 MB).
            </p>
            <div className="flex flex-wrap items-center gap-md">
              <PhotoPicker
                label="Ảnh vị trí"
                uri={photoUri}
                onChange={(uri, file) => {
                  setPhotoUri(uri);
                  setPhotoFile(file);
                }}
                onRemove={() => {
                  setPhotoUri(undefined);
                  setPhotoFile(undefined);
                }}
              />
              {photoUri ? null : <PhotoFramingGuide />}
            </div>
          </FormSection>

          {error ? <Callout tone="danger">{error}</Callout> : null}
          <Callout tone="neutral">
            Phường sẽ xem xét và khảo sát vị trí bạn đề xuất trước khi thêm vào lưới ô.
          </Callout>
        </div>

        <aside className="flex flex-col gap-md xl:sticky xl:top-0">
          <div className="hidden xl:block">
            <ProposalSteps steps={steps} sending={submit.isPending} layout="column" />
          </div>
          <AfterSubmit />
          <p className="flex items-center gap-xs rounded-[16px] bg-card p-sm text-body-sm text-muted shadow-card ring-1 ring-border">
            <Icon
              name="file-document-outline"
              size={18}
              color="currentColor"
              className="shrink-0 text-primary"
            />
            <span>
              Đề xuất đứng tên hồ sơ{' '}
              {registration?.displayName ? `${registration.displayName}, ` : ''}
              mã <span className="font-sign font-bold text-text">{hkdCode(registrationId)}</span>
            </span>
          </p>
        </aside>
      </div>
    </Screen>
  );
}

function FormSection({
  icon,
  title,
  required,
  hint,
  badge,
  children,
}: {
  icon: 'crosshairs-gps' | 'map-outline' | 'ruler-square' | 'camera-plus-outline';
  title: string;
  required?: boolean;
  hint?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-sm">
      <div className="flex items-center justify-between gap-sm">
        <h2 className="flex items-center gap-xs font-sign text-[18px] font-[650] leading-6 text-text">
          <Icon name={icon} size={20} color="currentColor" className="text-primary" />
          {title}
          {required ? <span className="text-primary">*</span> : null}
          {hint ? (
            <span className="font-sans text-body-sm font-normal text-muted">{hint}</span>
          ) : null}
        </h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

/** Four orange corner ticks, like the crop marks on a survey sheet. */
function CornerTicks() {
  const tick = 'pointer-events-none absolute z-10 h-4 w-4 border-brand';
  return (
    <>
      <span
        aria-hidden="true"
        className={`${tick} -left-1 -top-1 rounded-tl-[8px] border-l-[3px] border-t-[3px]`}
      />
      <span
        aria-hidden="true"
        className={`${tick} -right-1 -top-1 rounded-tr-[8px] border-r-[3px] border-t-[3px]`}
      />
      <span
        aria-hidden="true"
        className={`${tick} -bottom-1 -left-1 rounded-bl-[8px] border-b-[3px] border-l-[3px]`}
      />
      <span
        aria-hidden="true"
        className={`${tick} -bottom-1 -right-1 rounded-br-[8px] border-b-[3px] border-r-[3px]`}
      />
    </>
  );
}

function ProposalSteps({
  steps,
  sending,
  layout,
}: {
  steps: { label: string; done: boolean; optional?: boolean }[];
  sending: boolean;
  layout: 'row' | 'column';
}) {
  return (
    <div className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
      <ol
        aria-label="Các mục của đề xuất"
        className={layout === 'row' ? 'grid grid-cols-4 gap-xs' : 'flex flex-col gap-sm'}
      >
        {steps.map((step, i) => (
          <li
            key={step.label}
            className={`flex items-center gap-xs ${layout === 'row' ? 'flex-col text-center' : ''}`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sign text-[14px] font-bold ${
                step.done
                  ? 'sb-pop bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
                  : 'bg-card text-muted ring-1 ring-inset ring-border'
              }`}
            >
              {step.done ? <Icon name="check" size={16} color="currentColor" /> : i + 1}
            </span>
            <span className="min-w-0 text-body-sm leading-tight">
              <span className={step.done ? 'font-semibold text-text' : 'text-text'}>
                {step.label}
              </span>
              {step.optional ? (
                <span className="block text-body-xs text-muted">tuỳ chọn</span>
              ) : null}
              <span className="sr-only">{step.done ? ': đã xong' : ': chưa xong'}</span>
            </span>
          </li>
        ))}
      </ol>
      {sending ? (
        <p className="mt-sm flex items-center gap-xs text-body-sm font-semibold text-primary">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          Đang tải ảnh lên…
        </p>
      ) : null}
    </div>
  );
}

function AfterSubmit() {
  const stops = ['Gửi đề xuất', 'Phường xem xét và khảo sát', 'Thêm vào lưới ô'];
  return (
    <div className="rounded-[20px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 dark:bg-[#2A2420]">
      <p className="mb-sm font-sign text-[16px] font-bold text-text">Sau khi gửi</p>
      <ul className="flex flex-col gap-xs">
        {stops.map((s, i) => (
          <li key={s} className="flex items-center gap-xs text-body-sm text-text">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? 'bg-brand' : 'ring-2 ring-inset ring-brand/50'}`}
            />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The bay as typed, to scale, with the kerb under it; a faint placeholder until both sizes are numbers. */
function ProposedBayPreview({ width, length }: { width: number | null; length: number | null }) {
  const ok = width != null && length != null;
  const maxW = 180;
  const maxH = 96;
  const scale = ok ? Math.min(maxW / width, maxH / length) : 1;
  const w = ok ? Math.max(24, width * scale) : 120;
  const h = ok ? Math.max(18, length * scale) : 72;
  const fmt = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  return (
    <div
      role="img"
      aria-label={
        ok
          ? `Ô dự kiến ${fmt(width)} × ${fmt(length)} m, khoảng ${fmt(width * length)} m²`
          : 'Chưa có kích thước'
      }
      className="flex h-[168px] w-full shrink-0 flex-col items-center justify-end rounded-[16px] bg-bg p-sm ring-1 ring-inset ring-border md:w-[240px]"
    >
      <div className="flex flex-1 items-end justify-center pb-xs">
        <div
          className={`relative flex items-center justify-center rounded-[6px] border-2 border-dashed transition-[width,height] duration-200 ${
            ok ? 'border-brand bg-tint-primary' : 'border-border bg-card'
          }`}
          style={{ width: w, height: h }}
        >
          {ok ? (
            <>
              <span className="font-sign text-[14px] font-bold text-text">
                ≈ {fmt(width * length)} m²
              </span>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-sign text-[12px] font-bold text-primary">
                {fmt(width)} m
              </span>
              <span className="absolute -right-1 top-1/2 translate-x-full -translate-y-1/2 whitespace-nowrap pl-1 font-sign text-[12px] font-bold text-primary">
                {fmt(length)} m
              </span>
            </>
          ) : (
            <span className="px-1 text-center text-body-xs text-muted">
              Phường sẽ đo khi khảo sát
            </span>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin w-full rounded-full" />
    </div>
  );
}

/** How to frame the photo: the shopfront in the top half, the pavement and kerb in the bottom half. */
function PhotoFramingGuide() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 120"
      className="h-24 w-32 shrink-0 rounded-[12px] ring-1 ring-border"
    >
      <rect width="160" height="58" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
      <rect
        x="22"
        y="14"
        width="116"
        height="44"
        rx="2"
        className="fill-card stroke-muted/50"
        strokeWidth="1.5"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1="26"
          x2="134"
          y1={20 + i * 6}
          y2={20 + i * 6}
          className="stroke-muted/40"
          strokeWidth="1"
        />
      ))}
      <rect y="58" width="160" height="52" className="fill-sunken" />
      <rect
        x="40"
        y="66"
        width="80"
        height="32"
        rx="3"
        strokeDasharray="5 4"
        fill="none"
        strokeWidth="2"
        className="stroke-brand"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={i * 20}
          y="110"
          width="20"
          height="10"
          className={i % 2 ? 'fill-kerb-paint' : 'fill-kerb'}
        />
      ))}
      {[
        'M6 6h12M6 6v12',
        'M154 6h-12M154 6v12',
        'M6 114h12M6 114v-12',
        'M154 114h-12M154 114v-12',
      ].map((d) => (
        <path
          key={d}
          d={d}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-text"
          fill="none"
        />
      ))}
    </svg>
  );
}

function ProposalSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải" className="flex flex-col gap-md">
        <Skeleton className="h-11 w-96 max-w-full rounded-[14px]" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-16 w-full rounded-[20px]" />
        <Skeleton className="h-[300px] w-full rounded-[20px] md:h-[420px]" />
        <Skeleton className="h-24 w-full rounded-[16px]" />
      </div>
    </Screen>
  );
}
