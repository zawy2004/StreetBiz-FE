import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Icon } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import { parsePoint, wardApi, type WardCase } from '../ward-api';

/**
 * Proposal location: find the point, check it against the ward boundary, save
 * it. The save is chained to a check of the exact coordinates on screen
 * (`pointKey`), and the board shows that chain instead of a silently grey button.
 */
export function LocationReview({ record, onSaved }: { record: WardCase; onSaved: () => void }) {
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(String(record.location?.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(record.location?.longitude ?? ''));
  const point = parsePoint(latitude, longitude);
  const pointKey = JSON.stringify(point);
  const search = useMutation({ mutationFn: wardApi.search });
  const verify = useMutation({
    mutationFn: async () => {
      if (!point) throw new Error('Nhập đầy đủ vĩ độ và kinh độ hợp lệ.');
      return { ...(await wardApi.verify(point)), pointKey };
    },
  });
  const pin = useMutation({
    mutationFn: () => {
      if (!point) throw new Error('Tọa độ không hợp lệ.');
      return wardApi.pin(record.id, point);
    },
    onSuccess: onSaved,
  });
  const busy = search.isPending || verify.isPending || pin.isPending;
  const verified = verify.data?.pointKey === pointKey ? verify.data : undefined;

  const ids = useId();
  const addressId = `${ids}-address`;
  const latId = `${ids}-lat`;
  const lngId = `${ids}-lng`;
  const latRef = useRef<HTMLInputElement>(null);
  const noHits = search.data?.length === 0;
  // Nothing found for the address: move the cursor to the coordinates (focus only).
  useEffect(() => {
    if (noHits) latRef.current?.focus();
  }, [noHits, search.data]);

  const stale = !!verify.data && !verified;
  const chain: 'none' | 'stale' | 'inside' | 'outside' = verified
    ? verified.inside
      ? 'inside'
      : 'outside'
    : stale
      ? 'stale'
      : 'none';
  const typedBadly = (latitude.trim() !== '' || longitude.trim() !== '') && !point;
  const canSave = record.kind === 'proposals' && record.status === 'PENDING';
  const inputClass = (bad: boolean) =>
    `input-shell h-14 w-full rounded-sm border bg-card px-sm font-sign text-[22px] font-semibold text-text font-tabular disabled:cursor-not-allowed disabled:bg-sunken md:text-[24px] ${
      bad ? 'border-error' : 'border-border'
    }`;

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border"
    >
      <div className="flex flex-col gap-lg p-md md:p-lg">
        <h2 id={`${ids}-title`} className="font-sign text-[19px] font-bold leading-tight text-text">
          Vị trí và ranh giới phường
        </h2>

        {/* 1 — find from an address */}
        <Step n={1} title="Tìm từ địa chỉ">
          <label htmlFor={addressId} className="text-label text-text">
            Địa chỉ tìm kiếm
          </label>
          <div className="flex flex-col gap-sm sm:flex-row">
            <input
              id={addressId}
              className="input-shell h-12 w-full min-w-0 flex-1 rounded-sm border border-border bg-card px-sm text-body-lg text-text disabled:cursor-not-allowed disabled:bg-sunken"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={busy}
              maxLength={500}
            />
            <div className="sm:w-auto sm:shrink-0">
              <Button
                label="Tìm tọa độ từ địa chỉ"
                variant="outline"
                loading={search.isPending}
                disabled={busy || !address.trim()}
                onPress={() => search.mutate(address)}
              />
            </div>
          </div>
          {noHits && (
            <p className="flex items-center gap-xs text-body-md text-muted">
              <Icon name="map-marker-off-outline" size={18} color="currentColor" />
              Không tìm thấy địa chỉ. Bạn có thể nhập tọa độ.
            </p>
          )}
          {search.data && search.data.length > 0 ? (
            <ul className="flex flex-col gap-xs">
              {search.data.map((hit, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center gap-sm rounded-[12px] px-sm text-left text-body-md text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy}
                    onClick={() => {
                      setLatitude(String(hit.point.latitude));
                      setLongitude(String(hit.point.longitude));
                      pin.reset();
                    }}
                  >
                    <Icon
                      name="map-marker"
                      size={18}
                      color="currentColor"
                      className="shrink-0 text-primary"
                    />
                    {hit.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Step>

        <div className="grid gap-lg lg:grid-cols-2 lg:gap-md">
          {/* 2 — the coordinates */}
          <Step n={2} title="Tọa độ">
            <div className="grid grid-cols-2 gap-sm">
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={latId} className="flex items-center gap-1 text-label text-text">
                  <Icon
                    name="crosshairs-gps"
                    size={15}
                    color="currentColor"
                    className="text-primary"
                  />
                  Vĩ độ
                </label>
                <input
                  ref={latRef}
                  id={latId}
                  aria-label="Vĩ độ"
                  className={inputClass(typedBadly)}
                  inputMode="decimal"
                  value={latitude}
                  disabled={busy}
                  onChange={(e) => {
                    setLatitude(e.target.value);
                    pin.reset();
                  }}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={lngId} className="text-label text-text">
                  Kinh độ
                </label>
                <input
                  id={lngId}
                  aria-label="Kinh độ"
                  className={inputClass(typedBadly)}
                  inputMode="decimal"
                  value={longitude}
                  disabled={busy}
                  onChange={(e) => {
                    setLongitude(e.target.value);
                    pin.reset();
                  }}
                />
              </div>
            </div>
            {record.location ? (
              <p className="text-body-sm text-muted">
                Tọa độ hộ đề xuất ban đầu:{' '}
                <span className="font-tabular">
                  {record.location.latitude}, {record.location.longitude}
                </span>
              </p>
            ) : null}
            <div className="flex flex-col gap-sm sm:flex-row sm:flex-wrap sm:items-center">
              <div className="sm:w-auto">
                <Button
                  label="Kiểm tra ranh giới"
                  disabled={!point || busy}
                  loading={verify.isPending}
                  variant="outline"
                  onPress={() => verify.mutate()}
                />
              </div>
              {point && (
                <a
                  className="inline-flex min-h-11 items-center gap-xs text-body-md font-semibold text-indigo underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=18/${point.latitude}/${point.longitude}`}
                >
                  <Icon name="map-outline" size={18} color="currentColor" />
                  Xem vị trí trên OpenStreetMap
                </a>
              )}
            </div>
          </Step>

          {/* 3 — the boundary verdict */}
          <Step n={3} title="Phán quyết ranh giới">
            <BoundaryVerdict
              chain={chain}
              version={verified?.boundaryVersion}
              checkedAt={verified && point ? `${point.latitude}, ${point.longitude}` : null}
              verdictKey={`${pointKey}-${verified?.inside}`}
            />
          </Step>
        </div>

        {/* 4 — save, chained to the check above */}
        <Step n={4} title="Lưu tọa độ">
          {canSave ? (
            <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
              <div className="sm:w-auto">
                <Button
                  label="Lưu tọa độ đề xuất"
                  disabled={!verified?.inside || busy}
                  loading={pin.isPending}
                  onPress={() => pin.mutate()}
                />
              </div>
              <ChainNote chain={chain} />
            </div>
          ) : (
            <p className="text-body-md text-muted">
              Chỉ lưu được tọa độ khi hồ sơ đang ở trạng thái Chờ xử lý.
            </p>
          )}
          {pin.isSuccess && (
            <p
              role="status"
              className={`sb-pop flex items-center gap-xs rounded-[12px] px-sm py-xs text-[15px] font-semibold ${VERDICT_TONES.ok.wash} ${VERDICT_TONES.ok.ink}`}
            >
              <Icon name="check-circle" size={18} color="currentColor" />
              Đã lưu tọa độ và tải lại hồ sơ.
            </p>
          )}
        </Step>

        {[search.error, verify.error, pin.error].filter(Boolean).map((error, index) => (
          <p
            key={index}
            role="alert"
            className={`flex items-start gap-xs rounded-[12px] px-sm py-xs text-[15px] font-medium ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
          >
            <Icon
              name="alert-circle-outline"
              size={18}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            {error?.message}
          </p>
        ))}
      </div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-sm">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[15px] font-bold text-on-primary"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-sm">
        <p className="pt-1 font-sign text-[16px] font-bold leading-6 text-text">{title}</p>
        {children}
      </div>
    </div>
  );
}

/** The answer to the one question of a proposal: is this point inside the ward? */
function BoundaryVerdict({
  chain,
  version,
  checkedAt,
  verdictKey,
}: {
  chain: 'none' | 'stale' | 'inside' | 'outside';
  version?: string;
  checkedAt: string | null;
  verdictKey: string;
}) {
  if (chain === 'inside' || chain === 'outside') {
    const t = chain === 'inside' ? VERDICT_TONES.ok : VERDICT_TONES.danger;
    return (
      <div
        key={verdictKey}
        role="status"
        className={`sb-pop flex flex-col gap-xs rounded-[20px] p-md ${t.wash} ${t.ink}`}
      >
        <span className="flex items-center gap-sm">
          <Icon
            name={chain === 'inside' ? 'check-circle' : 'close-circle-outline'}
            size={40}
            color="currentColor"
            weight="fill"
            className="shrink-0"
          />
          <span className="font-sign text-[26px] font-extrabold leading-tight [font-stretch:90%] md:text-[32px]">
            {chain === 'inside' ? 'Trong ranh giới phường' : 'Ngoài ranh giới phường'}
          </span>
        </span>
        <span className="text-[13px] font-medium">
          {checkedAt ? `Đã kiểm tra: ${checkedAt} ` : ''}· Bản ranh giới: {version}
        </span>
      </div>
    );
  }
  const neutral = VERDICT_TONES.neutral;
  return (
    <div
      className={`flex items-center gap-sm rounded-[20px] border-2 border-dashed border-border p-md ${chain === 'stale' ? `${neutral.wash} ${neutral.ink}` : 'text-muted'}`}
    >
      <svg viewBox="0 0 40 48" aria-hidden="true" className="h-12 w-10 shrink-0">
        <rect
          x="15"
          y="8"
          width="10"
          height="30"
          rx="2"
          className="fill-card stroke-current"
          strokeWidth="2"
        />
        <rect x="15" y="14" width="10" height="5" className="fill-brand" />
        <path d="M20 2v6" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
        <rect x="0" y="40" width="40" height="5" rx="1" className="fill-brand" />
      </svg>
      <span className="text-[16px] font-semibold leading-6">
        {chain === 'stale' ? 'Tọa độ đã đổi, cần kiểm tra lại' : 'Chưa kiểm tra ranh giới'}
      </span>
    </div>
  );
}

/** The chain from the check to the save button, in words and colour. */
function ChainNote({ chain }: { chain: 'none' | 'stale' | 'inside' | 'outside' }) {
  const text =
    chain === 'inside'
      ? 'Đã kiểm tra đúng tọa độ này'
      : chain === 'outside'
        ? 'Tọa độ nằm ngoài ranh giới, không lưu được'
        : chain === 'stale'
          ? 'Kiểm tra lại trước khi lưu'
          : 'Kiểm tra ranh giới trước khi lưu';
  const tone =
    chain === 'inside'
      ? 'text-[#0B5D33] dark:text-[#8BE3B0]'
      : chain === 'outside'
        ? 'text-[#8F1717] dark:text-[#FF9A90]'
        : 'text-muted';
  return (
    <span className={`flex items-center gap-xs text-body-md font-medium ${tone}`}>
      <span
        aria-hidden="true"
        className={`h-[2px] w-8 rounded-full ${chain === 'inside' ? 'bg-tertiary' : chain === 'outside' ? 'bg-error' : 'border-t-2 border-dashed border-muted/50 bg-transparent'}`}
      />
      <Icon
        name={
          chain === 'inside'
            ? 'check-circle'
            : chain === 'outside'
              ? 'block-helper'
              : 'lock-outline'
        }
        size={17}
        color="currentColor"
      />
      {text}
    </span>
  );
}
