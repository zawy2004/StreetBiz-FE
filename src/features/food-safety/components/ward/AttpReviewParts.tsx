import { useId, useState, type ReactNode } from 'react';

import { Icon, Spinner } from '@/components/common';
import type { ButtonVariant } from '@/components/common/Button';
import { Skeleton } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import {
  FOOD_SAFETY_EVIDENCE_LABELS,
  type FoodSafetyApplication,
  type FoodSafetyEvidenceType,
} from '@/core/api/food-safety-api';
import { categoryIcon } from '@/features/buyer-discovery/category-icons';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import { colors } from '@/theme';
import { formatDay } from '../../format';
import { journeyMilestones, validitySpan, waitingOn, type MilestoneState } from '../../view';

const OK = VERDICT_TONES.ok;
const DANGER = VERDICT_TONES.danger;
const PENDING = VERDICT_TONES.pending;

const NODE: Record<MilestoneState, string> = {
  done: 'border-tertiary bg-tertiary text-white dark:text-[#06140C]',
  current: 'border-brand bg-card text-brand',
  failed: 'border-error bg-error text-white dark:text-[#1A0604]',
  stopped:
    'border-[#2B3640] bg-[#EEF1F4] text-[#2B3640] dark:border-[#C5D0DA] dark:bg-[#1D2833] dark:text-[#C5D0DA]',
  todo: 'border-border bg-card text-muted',
};

const STATE_WORDS: Record<MilestoneState, string> = {
  done: 'đã xong',
  current: 'đang ở bước này',
  failed: 'không đạt',
  stopped: 'đã dừng',
  todo: 'chưa tới',
};

/**
 * The file's five marks with their dates: lodged, reviewed by the ward, sent
 * to the department, result, valid until. Across on a tablet or wider, down
 * the page on a phone. The mark the file sits at glows.
 */
export function AttpJourney({ application }: { application: FoodSafetyApplication }) {
  const marks = journeyMilestones(application);
  return (
    <ol
      aria-label="Tiến trình hồ sơ ATTP"
      className="flex flex-col gap-0 md:flex-row md:items-start"
    >
      {marks.map((mark, index) => {
        const last = index === marks.length - 1;
        const next = marks[index + 1];
        const lit = next && (next.state === 'done' || next.state === 'failed');
        return (
          <li
            key={mark.key}
            className={`relative flex gap-sm pb-md md:flex-1 md:flex-col md:gap-xs md:pb-0 ${last ? 'pb-0 md:flex-none md:pr-0' : 'md:pr-xs'}`}
          >
            {!last ? (
              <span
                aria-hidden="true"
                className={[
                  'absolute left-[13px] top-7 h-[calc(100%-28px)] w-1 rounded-full md:left-8 md:right-1 md:top-[12px] md:h-1 md:w-auto',
                  lit ? 'bg-tertiary' : 'bg-border',
                ].join(' ')}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-[2.5px] ${NODE[mark.state]}`}
            >
              {mark.state === 'current' ? (
                <>
                  <span className="sb-slot-beacon absolute -inset-1.5 rounded-full bg-brand/25" />
                  <span className="relative size-2.5 rounded-full bg-brand" />
                </>
              ) : mark.state === 'done' ? (
                <Icon name="check" size={14} color="currentColor" />
              ) : mark.state === 'failed' ? (
                <Icon name="close" size={14} color="currentColor" />
              ) : mark.state === 'stopped' ? (
                <Icon name="minus" size={14} color="currentColor" />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pt-0.5 md:pt-0">
              <span
                className={`text-body-md font-semibold leading-tight ${mark.state === 'todo' ? 'text-muted' : mark.state === 'failed' ? 'text-error' : 'text-text'}`}
              >
                {mark.label}
                <span className="sr-only">: {STATE_WORDS[mark.state]}</span>
              </span>
              {mark.date && mark.state !== 'todo' ? (
                <span className="text-body-sm tabular-nums text-muted">{formatDay(mark.date)}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The certificate as the ward records it: the result in large words on a pale
 * wash, the number, the dates and the dishes. `draft` is the preview while the
 * form is filled in: watermarked, no stamp. The real one carries a StreetBiz
 * ward stamp (decoration; the words say the result).
 */
export function AttpCertificate({
  certificateNumber,
  issuedOn,
  expiresOn,
  storefrontName,
  dishes,
  expired = false,
  draft = false,
  stamp = 'static',
}: {
  certificateNumber: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  storefrontName: string;
  dishes: string[];
  expired?: boolean;
  draft?: boolean;
  /** `animate`: the stamp comes down (a result just recorded); `static`: it is already there. */
  stamp?: 'static' | 'animate';
}) {
  const tone = expired ? DANGER : OK;
  const span = validitySpan(issuedOn, expiresOn);
  return (
    <div className={`relative overflow-hidden rounded-[20px] p-md md:p-lg ${tone.wash}`}>
      {draft ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center font-sign text-[56px] font-extrabold tracking-[0.08em] text-text/[0.07] [transform:rotate(-12deg)]"
        >
          BẢN NHÁP
        </span>
      ) : null}
      <div className={`relative flex flex-col gap-xs ${draft ? '' : 'pr-[96px] md:pr-[132px]'}`}>
        <p
          className={`font-sign text-[32px] font-extrabold leading-none [font-stretch:88%] md:text-[40px] ${tone.ink}`}
        >
          {expired ? 'HẾT HẠN' : 'ĐẠT ATTP'}
        </p>
        <p
          className={`font-sign text-[20px] font-semibold tracking-[0.02em] tabular-nums ${tone.ink}`}
        >
          Giấy số {certificateNumber || '—'}
        </p>
        <p className={`text-body-lg font-medium ${tone.ink}`}>
          Hiệu lực {issuedOn ? formatDay(issuedOn) : '—'} – {expiresOn ? formatDay(expiresOn) : '—'}
          {span ? <span className="font-normal"> · {span}</span> : null}
        </p>
        <p className="mt-xs font-editorial text-[18px] font-semibold text-text">{storefrontName}</p>
        {dishes.length ? <p className="text-body-md text-text/80">{dishes.join(', ')}</p> : null}
        {draft ? (
          <p className="mt-xs text-body-sm text-text/70">
            Bản xem trước, đổi theo từng chữ bạn nhập.
          </p>
        ) : null}
      </div>
      {!draft ? (
        <PermitStamp
          icon="shield-check-outline"
          inkClass={tone.ink}
          strokeClass={tone.stroke}
          ringText="AN TOÀN THỰC PHẨM ★ PHƯỜNG ★"
          className={`absolute right-sm top-sm size-[92px] md:right-md md:top-md md:size-[120px] ${stamp === 'animate' ? '' : '!animate-none -rotate-[9deg]'}`}
        />
      ) : null}
    </div>
  );
}

const VARIANT: Record<
  Extract<ButtonVariant, 'primary' | 'outline' | 'danger' | 'approve'>,
  string
> = {
  primary:
    'bg-primary text-on-primary shadow-[0_10px_22px_-12px_rgb(var(--c-primary)/0.9)] hover:bg-primary-pressed',
  outline: 'bg-card text-text ring-1 ring-inset ring-border hover:bg-sunken hover:ring-text/25',
  danger: 'bg-error text-white hover:brightness-95 dark:text-[#1A0604]',
  approve: 'bg-tertiary text-white hover:brightness-95 dark:text-[#06140C]',
};

/**
 * A decision and what it leads to, said right under it. The button keeps its
 * name while it works (the spinner sits beside it), and points at its
 * consequence for screen readers.
 */
export function DecisionButton({
  label,
  consequence,
  variant,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  consequence: string;
  variant: keyof typeof VARIANT;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onPress}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-describedby={id}
        className={`inline-flex min-h-[52px] w-full items-center justify-center gap-xs rounded-[12px] px-md text-[15px] font-semibold transition-[background-color,filter,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 md:min-h-12 ${VARIANT[variant]}`}
      >
        {loading ? <Spinner size={18} /> : null}
        {label}
      </button>
      <p id={id} className="text-body-sm text-muted">
        {consequence}
      </p>
    </div>
  );
}

/** The five usual document types, ticked when the file has one. Neutral: nothing is "missing". */
export function EvidenceTypeChecklist({ types }: { types: FoodSafetyEvidenceType[] }) {
  return (
    <ul aria-label="Loại giấy tờ trong hồ sơ" className="flex flex-wrap gap-xs">
      {(Object.keys(FOOD_SAFETY_EVIDENCE_LABELS) as FoodSafetyEvidenceType[]).map((type) => {
        const has = types.includes(type);
        return (
          <li
            key={type}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-sm text-body-sm ${has ? `${OK.wash} ${OK.ink} font-semibold` : 'bg-sunken text-text/70'}`}
          >
            <Icon name={has ? 'check-circle' : 'circle-outline'} size={16} color="currentColor" />
            {FOOD_SAFETY_EVIDENCE_LABELS[type]}
            <span className="sr-only">{has ? ': có' : ': không có'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** A document laid on the desk: a sheet with a folded corner around the token-fetched preview. */
export function EvidenceSheetFrame({
  uploadedAt,
  children,
}: {
  uploadedAt: string;
  children: ReactNode;
}) {
  return (
    <li className="relative transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex flex-col items-center gap-xs rounded-[10px] bg-card px-sm pb-sm pt-md shadow-card ring-1 ring-border [clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,0_100%)]">
        {children}
        <span className="text-body-xs tabular-nums text-muted">
          tải lên {formatDay(uploadedAt)}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 size-[14px] rounded-bl-[4px] bg-[#E1E5EA] [clip-path:polygon(0_0,0_100%,100%_100%)] dark:bg-border"
      />
    </li>
  );
}

/** A dish of the file, photo first. A stock photo says so, and that the stall has none of its own. */
export function ReviewDishTile({ dish }: { dish: FoodSafetyApplication['dishes'][number] }) {
  const photos = menuItemPhotos({
    itemName: dish.name,
    categoryName: dish.categoryName,
    imageUrl: dish.imageUrl,
  });
  const ownPhoto = Boolean(dish.imageUrl);
  return (
    <li className="flex min-w-0 flex-col gap-xs">
      <FoodImage
        photos={photos}
        icon={categoryIcon(dish.categoryName)}
        iconSize={32}
        iconColor={colors.muted}
        className="aspect-[4/3] w-full rounded-[14px]"
        showIllustrativeTag
      />
      <span className="min-w-0">
        <span className="block truncate text-body-lg font-semibold text-text" title={dish.name}>
          {dish.name}
        </span>
        <span className="block text-body-sm text-muted">{dish.categoryName}</span>
        {!ownPhoto ? (
          <span className="block text-body-xs text-muted">Người bán chưa đăng ảnh thật</span>
        ) : null}
      </span>
    </li>
  );
}

/** The vendor's note, cut at four lines with a way to read the rest in place. */
export function VendorNote({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  const long = note.length > 220;
  return (
    <div className="rounded-[14px] border-l-4 border-brand/60 bg-[#FFF3E8] px-sm py-xs dark:bg-brand/10">
      <p className={`text-body-lg text-text ${long && !open ? 'line-clamp-4' : ''}`}>
        Ghi chú người bán: {note}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 h-9 text-label font-semibold text-primary"
        >
          {open ? 'Thu gọn' : 'Xem thêm'}
        </button>
      ) : null}
    </div>
  );
}

/** "Đã chờ phường 6 ngày": how long the file has been held where it is. */
export function WaitBadge({
  application,
  now,
}: {
  application: FoodSafetyApplication;
  now: number;
}) {
  const waiting = waitingOn(application, now);
  if (!waiting.who || waiting.days === null) return null;
  const who =
    waiting.who === 'WARD' ? 'phường' : waiting.who === 'VENDOR' ? 'người bán bổ sung' : 'Chi cục';
  const days = waiting.days === 0 ? 'từ hôm nay' : `${waiting.days} ngày`;
  const tone = waiting.who === 'WARD' ? PENDING : VERDICT_TONES.neutral;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-sm py-1 text-[16px] font-semibold ${tone.wash} ${tone.ink}`}
    >
      <Icon name="clock-outline" size={16} color="currentColor" />
      Đã chờ {who} {days}
    </span>
  );
}

/** Other files of the same stall already in the ward's queue cache. Read-only lines. */
export function OtherFiles({ files }: { files: FoodSafetyApplication[] }) {
  return (
    <section aria-labelledby="attp-other-files" className="flex flex-col gap-sm">
      <h2 id="attp-other-files" className="font-heading text-[19px] font-bold text-text">
        Hồ sơ khác của quán này
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-[18px] bg-card ring-1 ring-border">
        {files.map((file) => (
          <li
            key={file.applicationId}
            className="flex flex-wrap items-center gap-x-sm gap-y-1 px-md py-sm"
          >
            <span className="font-sign text-[16px] font-bold tabular-nums text-text">
              #{file.applicationId}
            </span>
            <span className="min-w-0 flex-1 truncate text-body-md text-text">
              {file.dishes.map((d) => d.name).join(', ')}
            </span>
            {file.isExpired ? <StatusChip code="EXPIRED" /> : <StatusChip code={file.status} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** First load: the dossier head and the decision card in their real shapes. */
export function AttpReviewSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto grid w-full max-w-[1320px] gap-lg p-md md:px-lg lg:px-xl lg:py-lg xl:grid-cols-[minmax(0,1fr)_400px]"
    >
      <span className="sr-only">Đang tải…</span>
      <div className="overflow-hidden rounded-[28px] bg-card ring-1 ring-border">
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
        <div className="flex flex-col gap-md p-lg">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-2/3" />
          <div className="flex items-center gap-sm">
            {[0, 1, 2, 3, 4].map((dot) => (
              <Skeleton key={dot} className="size-7 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-md rounded-[28px] bg-card p-lg ring-1 ring-border">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[104px] w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
