import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import {
  FOOD_SAFETY_EVIDENCE_LABELS,
  type FoodSafetyEvidenceType,
} from '@/core/api/food-safety-api';
import type { SellerMenuItem } from '@/core/api/seller-store-api';
import { categoryIcon } from '@/features/buyer-discovery/category-icons';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import { colors } from '@/theme';
import { RECOMMENDED_EVIDENCE } from '../../view';
import { DishFoodSafetyChip } from '../FoodSafetyBits';
import { playOnce } from '../motion';

const PENDING = VERDICT_TONES.pending;
const DANGER = VERDICT_TONES.danger;

/** The ward's request, pinned to the top of the file like a note on a board. */
export function WardRequestNote({ reason }: { reason: string }) {
  return (
    <div className="pt-xs">
      <div
        className={`relative -rotate-1 rounded-[18px] px-md pb-md pt-lg shadow-card md:px-lg ${PENDING.wash}`}
      >
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[-7px] size-[18px] -translate-x-1/2 rounded-full bg-[#B42318] shadow-[0_3px_0_rgb(0_0_0/0.18),inset_0_-3px_0_rgb(0_0_0/0.2)]"
        />
        <p className={`font-sign text-[18px] font-bold [font-stretch:92%] ${PENDING.ink}`}>
          Phường yêu cầu bổ sung
        </p>
        <p className={`mt-1 text-body-lg ${PENDING.ink}`}>{reason}</p>
      </div>
    </div>
  );
}

/**
 * One dish to pick, shown by its photo. The checkbox is real (the whole tile is
 * its label). A dish already covered by another file or a valid certificate
 * keeps its colours and says why it cannot be picked.
 */
export function DishPickTile({
  dish,
  checked,
  claimed,
  onToggle,
  wide = false,
}: {
  dish: SellerMenuItem;
  checked: boolean;
  claimed: boolean;
  onToggle: () => void;
  /** Alone in the grid: the tile takes two columns so the row is not empty. */
  wide?: boolean;
}) {
  const noteId = useId();
  return (
    <li className={wide ? 'md:col-span-2' : undefined}>
      <label
        title={claimed ? 'Món đã có hồ sơ hoặc giấy ATTP' : dish.name}
        className={[
          'group relative flex h-full gap-sm rounded-[16px] bg-card p-xs shadow-card transition-[box-shadow,transform] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary md:flex-col md:gap-0 md:overflow-hidden md:p-0',
          checked
            ? 'ring-2 ring-brand shadow-[0_12px_28px_-18px_rgb(var(--c-brand)/0.9)]'
            : 'ring-1 ring-border',
          claimed ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5',
        ].join(' ')}
      >
        <span className="relative size-16 shrink-0 overflow-hidden rounded-[12px] md:aspect-[4/3] md:size-auto md:w-full md:rounded-none">
          <FoodImage
            photos={menuItemPhotos({
              itemName: dish.name,
              categoryName: dish.categoryName,
              description: dish.description,
              imageUrl: dish.imageUrl,
            })}
            icon={categoryIcon(dish.categoryName)}
            iconSize={28}
            iconColor={colors.primary}
            placeholderClassName="bg-[#FFF3E8] dark:bg-sunken"
            className="h-full w-full"
            showIllustrativeTag
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 pr-xl md:p-sm md:pr-sm">
          <span className="line-clamp-2 font-editorial text-[17px] font-semibold leading-snug text-text md:text-[18px]">
            {dish.name}
          </span>
          <span className="text-body-sm text-muted">{dish.categoryName}</span>
          <span className="mt-auto flex flex-wrap gap-xs pt-1">
            <DishFoodSafetyChip
              status={dish.foodSafetyStatus}
              expiresOn={dish.foodSafetyExpiresOn}
            />
          </span>
          {claimed ? (
            <span id={noteId} className="flex items-center gap-1 text-body-sm text-text/75">
              <Icon name="lock-outline" size={14} color="currentColor" />
              Đã có hồ sơ hoặc giấy ATTP
            </span>
          ) : null}
        </span>
        <span className="absolute right-xs top-1/2 flex size-12 -translate-y-1/2 items-center justify-center md:right-1 md:top-1 md:translate-y-0">
          <input
            type="checkbox"
            className="peer size-7 cursor-pointer appearance-none rounded-full border-2 border-border bg-card shadow-card transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:bg-sunken md:border-white"
            checked={checked}
            disabled={claimed}
            aria-describedby={claimed ? noteId : undefined}
            onChange={onToggle}
          />
          {checked ? (
            <span className="sb-pop pointer-events-none absolute text-white" aria-hidden="true">
              <Icon name="check" size={16} color="currentColor" />
            </span>
          ) : claimed ? (
            <span className="pointer-events-none absolute text-muted" aria-hidden="true">
              <Icon name="lock-outline" size={14} color="currentColor" />
            </span>
          ) : null}
        </span>
      </label>
    </li>
  );
}

/** Band naming a group of dishes ("Cần giấy để được bán", "Món khác"). */
export function DishGroupLabel({ urgent, children }: { urgent?: boolean; children: ReactNode }) {
  return (
    <p
      className={`flex items-center gap-xs rounded-[10px] px-sm py-1.5 text-label ${urgent ? `${DANGER.wash} ${DANGER.ink}` : 'bg-sunken text-text'}`}
    >
      {urgent ? <Icon name="shield-alert-outline" size={16} color="currentColor" /> : null}
      {children}
    </p>
  );
}

export type SheetKind = 'photo' | 'file' | 'earlier';

/**
 * A document clipped into the folder: a sheet with a folded corner, its photo
 * or a document glyph, its type, and whether it came with the earlier file.
 */
export function EvidenceSheet({
  type,
  preview,
  kind,
  fresh,
  removeLabel,
  onRemove,
}: {
  type: FoodSafetyEvidenceType;
  preview: string;
  kind: SheetKind;
  /** Just uploaded: it slides into the folder. */
  fresh: boolean;
  removeLabel: string;
  onRemove: () => void;
}) {
  const sheet = useRef<HTMLLIElement>(null);
  const label = FOOD_SAFETY_EVIDENCE_LABELS[type];
  useEffect(() => {
    if (fresh)
      playOnce(
        sheet.current,
        [
          { transform: 'translateY(-16px) rotate(3deg)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 320 },
      );
  }, [fresh]);

  return (
    <li ref={sheet} className="relative h-[144px] w-[112px] shrink-0">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[10px] bg-card shadow-card ring-1 ring-border [clip-path:polygon(0_0,calc(100%-18px)_0,100%_18px,100%_100%,0_100%)]">
        {preview ? (
          <img src={preview} alt="" className="h-[92px] w-full object-cover" />
        ) : (
          <span className="flex h-[92px] w-full items-center justify-center bg-sunken text-primary">
            <Icon name="file-document-outline" size={34} color="currentColor" weight="duotone" />
          </span>
        )}
        <span className="line-clamp-2 px-xs pt-1 text-body-xs font-medium leading-tight text-text">
          {label}
          <span className="sr-only">
            {kind === 'photo' ? ', ảnh' : kind === 'earlier' ? ', đã nộp trước' : ', tệp'}
          </span>
        </span>
      </div>
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 size-[18px] rounded-bl-[5px] bg-[#E1E5EA] [clip-path:polygon(0_0,0_100%,100%_100%)] dark:bg-border"
      />
      {kind !== 'photo' ? (
        <span
          aria-hidden="true"
          className="absolute bottom-[50px] left-1 rounded-[5px] bg-card/95 px-1.5 py-[1px] text-[10.5px] font-bold text-text shadow-card"
        >
          {kind === 'earlier' ? 'Đã nộp trước' : 'PDF'}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="absolute -left-1.5 -top-1.5 flex size-8 items-center justify-center rounded-full bg-card text-text shadow-card ring-1 ring-border hover:text-error"
      >
        <Icon name="close" size={14} color="currentColor" />
      </button>
    </li>
  );
}

/**
 * The "add a document" sheet: a dashed page. Picking a file runs the same
 * checks as the shared photo picker (`validate` first, then a preview URL).
 */
export function AddEvidenceSheet({
  label,
  uploading,
  error,
  validate,
  onInvalid,
  onPick,
}: {
  label: string;
  uploading: boolean;
  error: boolean;
  validate: (file: File) => string | undefined;
  onInvalid: (message: string) => void;
  onPick: (preview: string, file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <li className="h-[144px] w-[112px] shrink-0">
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            const problem = validate(file);
            if (problem) onInvalid(problem);
            else onPick(URL.createObjectURL(file), file);
          }
          // Allow picking the same file again after removing it.
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`flex h-full w-full flex-col items-center justify-center gap-xs rounded-[10px] border-2 border-dashed bg-card/70 px-xs text-center transition-colors hover:bg-card ${error ? 'border-error' : 'border-brand/50'}`}
      >
        <Icon name="camera-plus-outline" size={28} color={error ? colors.error : colors.primary} />
        <span className="text-body-sm font-semibold text-text">{label}</span>
        {uploading ? (
          <span aria-hidden="true" className="sb-shimmer h-1.5 w-16 rounded-full" />
        ) : null}
      </button>
    </li>
  );
}

/** The four documents the ward usually asks for, ticked as they are attached. */
export function EvidenceChecklist({ types }: { types: FoodSafetyEvidenceType[] }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label text-text">Giấy nên có</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {RECOMMENDED_EVIDENCE.map((type) => {
          const has = types.includes(type);
          return (
            <li key={type} className="flex items-center gap-xs text-body-md text-text">
              {has ? (
                <span key="has" className="sb-pop flex text-tertiary">
                  <Icon name="check-circle" size={20} color="currentColor" />
                </span>
              ) : (
                <span key="missing" className="flex text-muted">
                  <Icon name="circle-outline" size={20} color="currentColor" />
                </span>
              )}
              <span>
                {FOOD_SAFETY_EVIDENCE_LABELS[type]}
                <span className="sr-only">{has ? ': đã có' : ': chưa có'}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Static advice for photographing a document so the ward does not send it back. */
export function PhotoTips() {
  return (
    <p className="flex items-start gap-xs rounded-[12px] bg-card/80 px-sm py-xs text-body-sm text-text/80">
      <Icon name="lightbulb-outline" size={18} color={colors.primary} className="mt-px shrink-0" />
      <span>
        Mẹo: Đặt giấy trên mặt phẳng, chụp thẳng, đủ sáng, không loá. Ảnh hoặc PDF tối đa 5 MB.
      </span>
    </p>
  );
}

function Condition({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-xs text-body-lg ${met ? 'text-text' : 'text-text/75'}`}>
      <span className={`flex ${met ? 'text-tertiary' : 'text-muted'}`}>
        <Icon name={met ? 'check-circle' : 'circle-outline'} size={20} color="currentColor" />
      </span>
      {children}
      <span className="sr-only">{met ? ': đạt' : ': chưa đạt'}</span>
    </li>
  );
}

/**
 * "Your file": what is in it and what is still missing before it can go. The
 * two conditions are the screen's own send rule, read out loud.
 */
export function ApplicationSummary({
  storeName,
  dishNames,
  fileCount,
  maxFiles,
  uploading,
}: {
  storeName: string | undefined;
  dishNames: string[];
  fileCount: number;
  maxFiles: number;
  uploading: boolean;
}) {
  return (
    <section
      aria-labelledby="attp-summary"
      className="flex flex-col gap-sm overflow-hidden rounded-[20px] bg-card p-md shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin -mx-md -mt-md mb-xs" />
      <h2 id="attp-summary" className="font-heading text-[19px] font-bold text-text">
        Hồ sơ của bạn
      </h2>
      <dl className="flex flex-col gap-xs text-body-md">
        {storeName ? (
          <div className="flex justify-between gap-sm">
            <dt className="text-muted">Gian hàng</dt>
            <dd className="min-w-0 truncate text-right font-semibold text-text">{storeName}</dd>
          </div>
        ) : null}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between gap-sm">
            <dt className="text-muted">Món</dt>
            <dd className="font-semibold text-text">Đã chọn {dishNames.length} món</dd>
          </div>
          {dishNames.length ? (
            <dd className="line-clamp-2 font-editorial text-[15px] text-text/80">
              {dishNames.join(', ')}
            </dd>
          ) : null}
        </div>
        <div className="flex justify-between gap-sm">
          <dt className="text-muted">Giấy tờ</dt>
          <dd className="font-sign font-bold tabular-nums text-text">
            {fileCount}/{maxFiles}
          </dd>
        </div>
      </dl>
      <ul
        aria-live="polite"
        className="flex flex-col gap-1 border-t border-dashed border-border pt-sm"
      >
        <Condition met={dishNames.length > 0}>Chọn ít nhất 1 món</Condition>
        <Condition met={fileCount > 0}>Đính kèm ít nhất 1 giấy tờ</Condition>
        {uploading ? (
          <li className="flex items-center gap-xs text-body-md text-text/75">
            <span className="sb-shimmer h-1.5 w-8 rounded-full" aria-hidden="true" />
            Đang tải giấy tờ lên…
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/** First load: the pinned note (when completing a file), six dish tiles and the folder. */
export function ApplySkeleton({ resubmit }: { resubmit: boolean }) {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex w-full max-w-[1320px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg"
    >
      <span className="sr-only">Đang tải…</span>
      <Skeleton className="h-9 w-56" />
      {resubmit ? <Skeleton className="h-[104px] w-full rounded-[18px]" /> : null}
      <Skeleton className="h-6 w-64" />
      <DishGridSkeleton />
      <Skeleton className="h-[220px] w-full rounded-[24px]" />
    </div>
  );
}

/** Dish tiles in grey while the menu loads. */
export function DishGridSkeleton() {
  return (
    <div className="grid gap-sm md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <div
          key={key}
          className="flex gap-sm rounded-[16px] bg-card p-xs ring-1 ring-border md:flex-col md:p-0"
        >
          <Skeleton className="size-16 shrink-0 rounded-[12px] md:aspect-[4/3] md:size-auto md:w-full md:rounded-none" />
          <div className="flex flex-1 flex-col gap-xs md:p-sm">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
