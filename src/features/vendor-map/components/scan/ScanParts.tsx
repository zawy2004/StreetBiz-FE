import { useId, useSyncExternalStore, type Ref } from 'react';

import { Icon, Spinner, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { Field, inputShellClass } from '@/components/forms';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import { formatDistance } from '@/features/buyer-discovery/discovery-format';
import { useRollingNumber } from '@/features/buyer-discovery/rolling-number';
import { SlotPlate } from '@/features/buyer-discovery/components/storefront/SlotPlate';
import type { PermitVerification } from '../../community-api';
import {
  daysLeft,
  distanceBetween,
  passSentence,
  passTone,
  passVerdict,
  validityProgress,
} from '../../scan-format';
import { WaitingPermitIllustration } from '../StreetArt';

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

const CORNERS = [
  'left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-[10px] group-focus-within:translate-x-[2px] group-focus-within:translate-y-[2px]',
  'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-[10px] group-focus-within:-translate-x-[2px] group-focus-within:translate-y-[2px]',
  'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-[10px] group-focus-within:translate-x-[2px] group-focus-within:-translate-y-[2px]',
  'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-[10px] group-focus-within:-translate-x-[2px] group-focus-within:-translate-y-[2px]',
];

/** "● Tra trực tiếp máy chủ": a reminder that nothing on this screen comes from a saved copy. */
export function LiveLookupChip() {
  return (
    <span className="flex h-9 items-center gap-1.5 rounded-full bg-tint-tertiary px-sm text-body-sm font-semibold text-tertiary">
      <span aria-hidden="true" className="relative flex h-2 w-2">
        <span className="sb-ping absolute inset-0 rounded-full bg-tertiary" />
        <span className="relative h-2 w-2 rounded-full bg-tertiary" />
      </span>
      Tra trực tiếp máy chủ
    </span>
  );
}

type SlotProps = {
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  checking: boolean;
  onCheck: () => void;
};

/**
 * The slot the code goes into: a large field framed by orange viewfinder
 * corners (they close in on focus; a hint of a QR, not a fake camera), one
 * wide "Kiểm tra" button, then the promise (always a live lookup) and what is
 * sent with it.
 */
export function CodeSlot({ code, onCodeChange, error, checking, onCheck }: SlotProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <Field htmlFor={id} label="Nội dung QR giấy phép" error={error} messageId={messageId}>
        <div className="group relative p-[7px]">
          {CORNERS.map((corner) => (
            <span
              key={corner}
              aria-hidden="true"
              className={`pointer-events-none absolute h-6 w-6 border-brand transition-[transform,border-color] duration-150 group-focus-within:border-primary ${corner}`}
            />
          ))}
          <textarea
            id={id}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Dán nội dung mã QR"
            rows={3}
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId : undefined}
            className={`${inputShellClass(error)} block min-h-[96px] w-full resize-none px-sm py-sm font-sign text-[16px] leading-relaxed text-text [font-stretch:92%] placeholder:font-sans placeholder:text-body-lg placeholder:text-muted/80`}
          />
        </div>
      </Field>
      <button
        type="button"
        onClick={onCheck}
        disabled={!code.trim() || checking}
        aria-busy={checking || undefined}
        className="flex h-14 w-full items-center justify-center gap-xs rounded-[14px] bg-primary px-lg text-[16px] font-semibold text-on-primary shadow-[0_12px_26px_-12px_rgb(var(--c-primary)/0.9)] transition-[background-color,transform,opacity] duration-150 hover:bg-primary-pressed active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
      >
        {checking ? (
          <Spinner size={20} />
        ) : (
          <Icon name="shield-check-outline" size={20} color="currentColor" />
        )}
        Kiểm tra
      </button>
      <ul className="flex flex-col gap-xs text-body-sm text-muted">
        <li className="flex items-start gap-xs">
          <Icon
            name="cloud-check-outline"
            size={17}
            color="currentColor"
            className="mt-px shrink-0 text-tertiary"
          />
          Mỗi lần bấm Kiểm tra đều tra trực tiếp với máy chủ, không dùng bản lưu.
        </li>
        <li className="flex items-start gap-xs">
          <Icon
            name="crosshairs-gps"
            size={17}
            color="currentColor"
            className="mt-px shrink-0 text-indigo"
          />
          Nếu bạn cho phép, vị trí hiện tại được gửi kèm để đối chiếu.
        </li>
      </ul>
    </div>
  );
}

const STEPS: { icon: IconName; text: string }[] = [
  { icon: 'qrcode', text: 'Tìm tấm giấy phép có mã QR ở quầy.' },
  { icon: 'qrcode-scan', text: 'Quét bằng camera điện thoại, sao chép nội dung mã.' },
  { icon: 'clipboard-text-outline', text: 'Dán vào ô nhập mã rồi bấm Kiểm tra.' },
];

/** Before any check: a permit pass hanging at a stall, its stamp waiting, and the three steps. */
export function ScanIdle() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border">
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-lg p-lg md:flex-row md:items-center md:gap-xl md:p-xl">
        <WaitingPermitIllustration className="mx-auto h-auto w-[200px] shrink-0 md:mx-0 md:w-[220px]" />
        <div className="flex min-w-0 flex-col gap-md">
          <div className="flex flex-col gap-1">
            <p className="font-editorial text-[28px] font-semibold leading-tight text-text">
              Quán này có phép không?
            </p>
            <p className="text-body-md text-muted">
              Mỗi quán có phép đều treo một tấm giấy phép có mã QR của phường.
            </p>
          </div>
          <ol className="flex flex-col gap-sm">
            {STEPS.map((step, i) => (
              <li key={step.text} className="flex items-start gap-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[15px] font-bold text-on-primary">
                  {i + 1}
                </span>
                <span className="flex items-start gap-1.5 pt-1 text-body-md leading-snug text-text">
                  {step.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** A check in flight: the pass's outline, so nothing jumps when the answer lands. */
export function CheckingPass() {
  return (
    <div
      role="status"
      aria-label="Đang kiểm tra trực tiếp…"
      className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md bg-sunken/60 p-md md:p-lg">
        <Skeleton className="h-12 w-[150px] !rounded-[8px]" />
        <Skeleton className="h-12 w-1/2" />
        <p className="flex items-center gap-xs text-body-md font-medium text-text">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          Đang kiểm tra trực tiếp…
        </p>
      </div>
      <div className="flex flex-col gap-sm p-md md:p-lg">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-xs h-2 w-full !rounded-full" />
        <div className="mt-xs grid gap-sm sm:grid-cols-2">
          <Skeleton className="h-12 w-full !rounded-[12px]" />
          <Skeleton className="h-12 w-full !rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}

/** No permit behind the code: a pass with a dashed red edge, in the screen's own words. */
export function PublicNotFoundPass({ headingRef }: { headingRef?: Ref<HTMLHeadingElement> }) {
  const tone = VERDICT_TONES.danger;
  return (
    <section
      aria-label="Kết quả kiểm tra giấy phép"
      aria-live="polite"
      className={`sb-pop relative flex flex-col items-center gap-sm overflow-hidden rounded-[28px] border-2 border-dashed border-[#8F1717]/45 px-lg py-2xl text-center dark:border-[#FF9A90]/45 ${tone.wash}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-card ${tone.ink}`}
      >
        <Icon name="qrcode-remove" size={34} color="currentColor" />
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={`font-sign text-[30px] font-extrabold leading-tight outline-none [font-stretch:90%] ${tone.ink}`}
      >
        Mã QR không hợp lệ
      </h2>
      <p className="max-w-[44ch] text-body-md text-text/80">
        Chữ ký hoặc giấy phép tương ứng không tồn tại. Lần kiểm tra đã được ghi nhận.
      </p>
    </section>
  );
}

type PassProps = {
  result: PermitVerification;
  /** When this check was sent (the mutation's own clock); replays the stamp per check. */
  checkedAt: Date | null;
  /** Where the buyer was for this check, if they allowed it. */
  userPoint?: { latitude: number; longitude: number };
  headingRef?: Ref<HTMLHeadingElement>;
  onProfile?: () => void;
  onReport?: () => void;
};

/**
 * The permit, as a pass in the hand: the painted kerb on top, the slot plate,
 * the verdict in large words on a pale wash of its tone (≥ 7:1), the ward stamp
 * coming down once per check, then whose it is, when it was looked up, how long
 * it runs, how far the buyer is from the licensed spot, and the two ways on.
 */
export function PublicPermitPass({
  result,
  checkedAt,
  userPoint,
  headingRef,
  onProfile,
  onReport,
}: PassProps) {
  const tone = passTone(result.status, result.isValid);
  const verdict = VERDICT_TONES[tone];
  const sentence = passSentence(tone, result.slotCode);
  const from = result.validFrom ? new Date(result.validFrom).toLocaleDateString('vi-VN') : '—';
  const until = result.validUntil ? new Date(result.validUntil).toLocaleDateString('vi-VN') : '—';
  const distance =
    userPoint && result.latitude != null && result.longitude != null
      ? distanceBetween(userPoint, { latitude: result.latitude, longitude: result.longitude })
      : null;

  return (
    <section
      aria-label="Kết quả kiểm tra giấy phép"
      aria-live="polite"
      className="sb-pop overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div
        className={`relative overflow-hidden px-md pb-md pt-md md:px-lg md:pb-lg ${verdict.wash}`}
      >
        <div className="relative z-10 pr-[104px] md:pr-[150px]">
          <SlotPlate code={result.slotCode} size="lg" />
        </div>
        <div
          className={`relative z-10 mt-md flex items-center gap-sm pr-[88px] md:pr-[150px] ${verdict.ink}`}
        >
          <Icon name={verdict.icon} size={44} color="currentColor" weight="fill" />
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-sign text-[40px] font-extrabold leading-none tracking-[-0.01em] outline-none [font-stretch:88%] md:text-[52px]"
          >
            {passVerdict(result.status, result.isValid)}
          </h2>
        </div>
        {sentence ? (
          <p
            className={`relative z-10 mt-sm max-w-[40ch] text-body-lg font-semibold ${verdict.ink}`}
          >
            {sentence}
          </p>
        ) : null}
        <PermitStamp
          key={checkedAt?.getTime() ?? 'pass'}
          icon={verdict.icon}
          inkClass={verdict.ink}
          strokeClass={verdict.stroke}
          className="absolute -right-2 top-3 h-[112px] w-[112px] [animation-delay:120ms] md:right-md md:top-md md:h-[136px] md:w-[136px]"
        />
      </div>

      <div className="flex flex-col gap-md p-md md:p-lg">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-sm">
            {result.displayName ? (
              <p className="text-[22px] font-semibold leading-snug tracking-[-0.01em] text-text">
                {result.displayName}
              </p>
            ) : null}
            <StatusChip code={result.status} />
          </div>
          {checkedAt ? (
            <p className="flex items-center gap-1.5 text-body-md text-muted">
              <Icon name="clock-outline" size={16} color="currentColor" />
              Tra trực tiếp với máy chủ lúc {timeFormat.format(checkedAt)}
            </p>
          ) : null}
        </div>

        <dl className="grid gap-px overflow-hidden rounded-[16px] bg-border ring-1 ring-border sm:grid-cols-2">
          <div className="flex flex-col gap-1 bg-card p-sm md:p-md">
            <dt className="text-body-xs text-muted">Ô được cấp phép</dt>
            <dd className="text-[17px] font-semibold leading-snug text-text">
              {result.slotCode ?? 'Không có dữ liệu'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 bg-card p-sm md:p-md">
            <dt className="text-body-xs text-muted">Thời hạn</dt>
            <dd className="text-[17px] font-semibold leading-snug text-text">{`${from} – ${until}`}</dd>
          </div>
        </dl>

        <ValidityRuler
          validFrom={result.validFrom}
          validUntil={result.validUntil}
          showDays={tone === 'ok'}
        />

        {distance != null ? (
          <p className="flex items-start gap-xs text-body-md text-text/85">
            <Icon
              name="map-marker-radius-outline"
              size={18}
              color="currentColor"
              className="mt-0.5 shrink-0 text-indigo"
            />
            <span>
              Bạn đang cách vị trí được cấp phép khoảng {formatDistance(distance)}.
              {distance > 150
                ? ' Nếu quầy không ở đúng ô được cấp, bạn có thể báo cáo bất thường.'
                : ''}
            </span>
          </p>
        ) : null}

        {onProfile && onReport ? (
          <div className="grid gap-sm sm:grid-cols-2">
            <button
              type="button"
              onClick={onProfile}
              className="inline-flex h-12 items-center justify-center gap-xs rounded-[12px] bg-card px-md text-[15px] font-semibold text-text ring-1 ring-inset ring-text/20 transition-colors hover:bg-sunken"
            >
              <Icon name="storefront-outline" size={18} color="currentColor" />
              Xem hồ sơ hộ kinh doanh
            </button>
            <button
              type="button"
              onClick={onReport}
              className={`inline-flex h-12 items-center justify-center gap-xs rounded-[12px] bg-card px-md text-[15px] font-semibold text-error ring-inset transition-colors hover:bg-tint-error ${tone === 'danger' ? 'ring-2 ring-error/80' : 'ring-1 ring-error/40'}`}
            >
              <Icon name="flag-outline" size={18} color="currentColor" />
              Báo cáo bất thường
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The permit's term as a bar: the part already run in pale green, what is left
 * in full green, a brand-orange dot at today; "Còn n ngày" counted up beside it
 * while the permit is good. Hidden when a date is missing.
 */
function ValidityRuler({
  validFrom,
  validUntil,
  showDays,
}: {
  validFrom: string | null;
  validUntil: string | null;
  showDays: boolean;
}) {
  const progress = validityProgress(validFrom, validUntil);
  const days = daysLeft(validUntil);
  const running = useRollingNumber(Math.max(days ?? 0, 0), { duration: 400, from: 0 });
  if (progress == null) return null;

  return (
    <div className="flex items-center gap-md">
      <div aria-hidden="true" className="relative h-2 flex-1 rounded-full bg-sunken">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${showDays ? 'bg-tertiary/35' : 'bg-muted/30'}`}
          style={{ width: `${progress * 100}%` }}
        />
        <span
          className={`absolute inset-y-0 right-0 rounded-full ${showDays ? 'bg-tertiary' : 'bg-muted/50'}`}
          style={{ width: `${(1 - progress) * 100}%` }}
        />
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card bg-brand shadow-card"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      {showDays && days != null && days >= 0 ? (
        <span className="shrink-0 font-sign text-[22px] font-bold font-tabular leading-none text-tertiary [font-stretch:90%]">
          Còn {running} ngày
        </span>
      ) : null}
    </div>
  );
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** A pale note while the device is offline; the button still works and the error still shows, as before. */
export function OfflineNote() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p
      role="status"
      className="flex items-center gap-xs rounded-[14px] bg-[#FFF3D1] px-md py-sm text-body-md font-semibold text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]"
    >
      <Icon name="alert-circle-outline" size={18} color="currentColor" />
      Bạn đang ngoại tuyến. Kiểm tra giấy phép cần kết nối mạng.
    </p>
  );
}
