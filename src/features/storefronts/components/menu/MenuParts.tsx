import { useEffect, useRef, useState, type ReactNode } from 'react';

import { formatVnd, Icon, Spinner, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import type { FoodPhoto } from '@/features/buyer-discovery/food-photos';
import { playOnce } from '@/features/food-safety/components/motion';
import { colors } from '@/theme';
import type { BuyerVisibility } from '../../menu-view';

export type PlateDish = {
  id: string | number;
  name: string;
  photos: FoodPhoto[];
  icon: IconName;
  needsAttp?: boolean;
  soldOut?: boolean;
  editing?: boolean;
};

function Plate({ dish, fresh }: { dish: PlateDish; fresh: boolean }) {
  const plate = useRef<HTMLSpanElement>(null);
  // Whether this plate arrived after the shelf was first drawn: a dish just added.
  const born = useRef(fresh);
  const [steaming, setSteaming] = useState(false);
  const illustrative = dish.photos[0]?.illustrative ?? false;

  useEffect(() => {
    if (!born.current) return;
    playOnce(
      plate.current,
      [
        { transform: 'scale(0.85)', boxShadow: '0 0 0 0 rgb(var(--c-brand) / 0.7)' },
        { transform: 'scale(1)', boxShadow: '0 0 0 10px rgb(var(--c-brand) / 0)' },
      ],
      { duration: 600 },
    );
    setSteaming(true);
    const timer = setTimeout(() => setSteaming(false), 4800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <li className="flex w-[72px] shrink-0 flex-col items-center gap-1 md:w-[100px] xl:w-[120px]">
      <span
        ref={plate}
        className={[
          'relative flex size-16 items-center justify-center rounded-full p-1 transition-transform duration-200 hover:-translate-y-[3px] md:size-[88px] xl:size-28',
          'bg-[radial-gradient(circle_at_50%_40%,#ffffff_55%,#eef1f4_100%)] shadow-[0_10px_18px_-10px_rgb(17_28_43/0.45),inset_0_0_0_1px_rgb(17_28_43/0.06)] dark:bg-[radial-gradient(circle_at_50%_40%,rgb(var(--c-card))_55%,rgb(var(--c-sunken))_100%)]',
          dish.editing
            ? 'ring-[3px] ring-brand ring-offset-2 ring-offset-[#FFF3E8] dark:ring-offset-transparent'
            : '',
        ].join(' ')}
      >
        <FoodImage
          photos={dish.photos}
          icon={dish.icon}
          iconSize={26}
          iconColor={colors.primary}
          placeholderClassName="bg-[#FFF3E8] dark:bg-sunken"
          className="h-full w-full rounded-full"
        />
        {dish.soldOut ? (
          <span className="absolute inset-x-1 top-1/2 -translate-y-1/2 -rotate-[16deg] rounded-[4px] bg-error py-[1px] text-center font-sign text-[11px] font-extrabold tracking-[0.12em] text-white md:text-[13px]">
            HẾT
          </span>
        ) : null}
        {dish.needsAttp ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-6 items-center justify-center rounded-full bg-error text-white shadow-card ring-2 ring-card md:size-7">
            <Icon name="shield-alert-outline" size={14} color="currentColor" weight="fill" />
          </span>
        ) : null}
        {steaming ? (
          <svg
            viewBox="0 0 120 80"
            className="sb-steam pointer-events-none absolute -top-8 left-1/2 h-10 w-16 -translate-x-1/2"
          >
            {[
              'M38 78 C 26 60, 50 48, 38 26 S 44 8, 40 2',
              'M60 78 C 48 60, 72 48, 60 26 S 66 8, 62 2',
              'M82 78 C 70 60, 94 48, 82 26 S 88 8, 84 2',
            ].map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="rgb(var(--c-brand) / 0.5)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            ))}
          </svg>
        ) : null}
      </span>
      <span
        className="w-full truncate text-center text-[13px] font-semibold text-text"
        title={dish.name}
      >
        {dish.name}
      </span>
      {illustrative ? <span className="-mt-1 text-[11px] text-muted">minh họa</span> : null}
    </li>
  );
}

const EMPTY_PLATE =
  'flex size-16 items-center justify-center rounded-full border-[2.5px] border-dashed border-brand/45 bg-card/60 text-primary transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-brand md:size-[88px] xl:size-28';

/**
 * The stall's counter: one porcelain plate per dish it may sell, photos on the
 * full ones, dashed rims where a dish can still go. A plate added while the
 * page is open is set down with a little steam.
 */
export function PlateRail({
  dishes,
  slots,
  onEmptyPlate,
  caption,
}: {
  dishes: PlateDish[];
  /** Plates on the rail; empty ones invite a new dish. */
  slots: number;
  onEmptyPlate?: () => void;
  caption?: ReactNode;
}) {
  const drawn = useRef(false);
  useEffect(() => {
    drawn.current = true;
  }, []);
  const empty = Math.max(0, slots - dishes.length);
  return (
    <section
      aria-label="Kệ món"
      className="flex flex-col gap-md rounded-[28px] bg-[#FFF3E8] p-md ring-1 ring-brand/15 dark:bg-brand/10 md:p-lg"
    >
      <ul className="no-scrollbar -mx-1 flex items-start gap-xs overflow-x-auto px-1 pb-1 pt-2 md:gap-md">
        {dishes.map((dish) => (
          <Plate key={dish.id} dish={dish} fresh={drawn.current} />
        ))}
        {Array.from({ length: empty }, (_, index) => {
          const number = dishes.length + index + 1;
          return (
            <li
              key={`empty-${number}`}
              className="flex w-[72px] shrink-0 flex-col items-center gap-1 md:w-[100px] xl:w-[120px]"
            >
              {onEmptyPlate ? (
                <button
                  type="button"
                  onClick={onEmptyPlate}
                  aria-label={`Chỗ trống ${number}: thêm món mới`}
                  className={`group ${EMPTY_PLATE}`}
                >
                  <Icon
                    name="plus"
                    size={24}
                    color="currentColor"
                    className="transition-transform duration-500 group-hover:rotate-90"
                  />
                </button>
              ) : (
                <span aria-hidden="true" className={EMPTY_PLATE}>
                  <Icon name="plus" size={24} color="currentColor" />
                </span>
              )}
              <span aria-hidden="true" className="text-[13px] font-medium text-muted">
                Chỗ trống
              </span>
            </li>
          );
        })}
      </ul>
      {caption}
    </section>
  );
}

/**
 * How many dishes buyers actually see, and why the rest are missing (ATTP,
 * admin, sold out, a paused stall). Holds the page's one ATTP button.
 */
export function BuyerVisibilityStrip({
  visibility,
  action,
}: {
  visibility: BuyerVisibility;
  action: ReactNode;
}) {
  const { visible, total, soldOut, needsAttp, pending, hidden, storePaused } = visibility;
  const reasons = [
    needsAttp ? `${needsAttp} món cần giấy ATTP` : null,
    pending ? `${pending} món chờ duyệt ATTP` : null,
    hidden ? `${hidden} món bị quản trị viên ẩn` : null,
    soldOut ? `${soldOut} món đang báo hết` : null,
  ].filter(Boolean);
  const tone = storePaused ? VERDICT_TONES.pending : null;
  return (
    <section
      aria-label="Khách đang thấy"
      className={`flex flex-col gap-sm rounded-[20px] p-md md:flex-row md:items-center md:justify-between md:gap-lg ${tone ? `${tone.wash}` : 'bg-card shadow-card ring-1 ring-border'}`}
    >
      <div className="flex min-w-0 items-start gap-sm">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone ? 'bg-card/70' : 'bg-tint-primary'} ${tone ? tone.ink : 'text-primary'}`}
        >
          <Icon
            name={storePaused ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="currentColor"
          />
        </span>
        <div className="min-w-0">
          {storePaused ? (
            <p className={`text-body-lg font-semibold ${tone!.ink}`}>
              Quán đang tạm dừng: khách tạm thời không xem được món
            </p>
          ) : (
            <p className="font-sign text-[20px] font-bold leading-tight text-text [font-stretch:94%]">
              {total
                ? `Khách đang thấy ${visible}/${total} món`
                : 'Thực đơn chưa có món cho khách xem'}
            </p>
          )}
          {reasons.length ? (
            <p className={`mt-0.5 text-body-md ${tone ? tone.ink : 'text-text/75'}`}>
              {reasons.join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
      <div className="w-full shrink-0 md:w-auto">{action}</div>
    </section>
  );
}

/** "Đánh dấu hết món" / "Còn hàng trở lại" as a big switch; it only moves when the server answers. */
export function SoldOutToggle({
  available,
  label,
  disabled,
  pending,
  onPress,
}: {
  available: boolean;
  label: string;
  disabled: boolean;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-busy={pending || undefined}
      className="flex min-h-[52px] w-full items-center justify-between gap-sm rounded-[14px] bg-card px-md text-[15px] font-semibold text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:w-auto"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${available ? 'bg-tertiary' : 'bg-error'}`}
      >
        <span
          className={`absolute flex size-[22px] items-center justify-center rounded-full bg-white shadow transition-transform duration-150 ${available ? 'translate-x-[23px]' : 'translate-x-[3px]'}`}
        >
          {pending ? <Spinner size={12} color={colors.muted} /> : null}
        </span>
      </span>
    </button>
  );
}

/** "Gỡ món": a quiet red text button; the confirmation dialog does the warning. */
export function RemoveDishButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="inline-flex h-12 items-center justify-center gap-xs whitespace-nowrap rounded-[12px] px-md text-[15px] font-semibold text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon name="trash-can-outline" size={18} color="currentColor" />
      Gỡ món
    </button>
  );
}

/**
 * The large photo well of the dish form. Picking a file (tap, or drop it on a
 * computer) runs the same checks as the shared photo picker: `validate`
 * first, then a local preview URL with the file.
 */
export function DishPhotoField({
  label,
  uri,
  error,
  uploading,
  validate,
  onInvalid,
  onChange,
}: {
  label: string;
  uri?: string;
  error: boolean;
  uploading: boolean;
  validate: (file: File) => string | undefined;
  onInvalid: (message: string) => void;
  onChange: (uri: string, file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const handle = (file: File | undefined) => {
    if (!file) return;
    const problem = validate(file);
    if (problem) {
      onInvalid(problem);
      return;
    }
    onChange(URL.createObjectURL(file), file);
  };
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        handle(event.dataTransfer.files?.[0]);
      }}
      className={[
        'relative aspect-[4/3] w-full overflow-hidden rounded-[18px] transition-[box-shadow] duration-150',
        uri ? 'bg-sunken' : 'border-2 border-dashed bg-[#FFF3E8] dark:bg-brand/10',
        error ? 'border-error ring-2 ring-error/40' : uri ? '' : 'border-brand/50',
        over ? 'ring-2 ring-brand' : '',
      ].join(' ')}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={label}
        onChange={(event) => {
          handle(event.target.files?.[0]);
          // Allow picking the same file again after removing it.
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-full w-full flex-col items-center justify-center gap-xs text-center"
      >
        {uri ? (
          <img src={uri} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-card text-primary shadow-card">
              <Icon name="camera-plus-outline" size={28} color="currentColor" />
            </span>
            <span className="text-body-lg font-semibold text-text">{label}</span>
            <span className="text-body-sm text-muted">Chạm để chụp hoặc chọn ảnh</span>
          </>
        )}
        {uri ? (
          <span className="absolute bottom-sm right-sm flex items-center gap-1 rounded-full bg-card/95 px-sm py-1 text-label text-text shadow-card">
            <Icon name="camera-plus-outline" size={16} color="currentColor" />
            {label}
          </span>
        ) : null}
      </button>
      {uploading ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-card shadow-card">
            <Spinner size={22} color={colors.primary} />
          </span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * The dish as a buyer will meet it on the market, drawn from what is typed.
 * Its name is plain text, not a heading, so the dish list keeps the only one.
 */
export function BuyerPreviewCard({
  name,
  price,
  description,
  photos,
  icon,
  needsAttp,
}: {
  name: string;
  price: number | null;
  description: string;
  photos: FoodPhoto[];
  icon: IconName;
  needsAttp: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-card ring-2 ring-brand">
      <span className="absolute left-sm top-sm z-10 rounded-full bg-brand px-xs py-0.5 text-[11px] font-bold text-white">
        Khách sẽ thấy
      </span>
      <FoodImage
        photos={photos}
        icon={icon}
        iconSize={36}
        iconColor={colors.primary}
        placeholderClassName="bg-[#FFF3E8] dark:bg-sunken"
        className="aspect-[4/3] w-full"
        showIllustrativeTag
      />
      <div className="flex flex-col gap-1 p-sm">
        <p className="line-clamp-2 font-editorial text-[20px] font-semibold leading-tight text-text">
          {name || 'Món của bạn'}
        </p>
        <p className="font-sign text-[18px] font-bold tabular-nums text-primary">
          {price ? formatVnd(price) : '— đ'}
        </p>
        {description ? (
          <p className="line-clamp-2 text-body-sm text-text/75">{description}</p>
        ) : null}
        {needsAttp ? (
          <p className="flex items-center gap-1 text-body-xs font-medium text-text/75">
            <Icon name="shield-check-outline" size={14} color="currentColor" />
            Hiện với khách sau khi có giấy ATTP
          </p>
        ) : null}
      </div>
    </div>
  );
}

const TIPS = [
  'Chụp gần cửa hoặc ngoài trời: ánh sáng tự nhiên cho màu món thật nhất.',
  'Đặt máy chếch khoảng 45°, món chiếm gần hết khung.',
  'Dọn gọn nền: một chiếc đĩa, đôi đũa là đủ.',
];

/** Three static tips for a dish photo that sells. */
export function DishPhotoTips() {
  return (
    <div className="flex flex-col gap-xs rounded-[16px] bg-sunken/70 p-sm">
      <p className="flex items-center gap-xs text-label text-text">
        <Icon name="lightbulb-outline" size={18} color={colors.primary} />
        Mẹo chụp ảnh món
      </p>
      <ul className="flex flex-col gap-1 pl-[26px] text-body-sm text-text/80">
        {TIPS.map((tip) => (
          <li key={tip} className="list-disc">
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** No dish yet: an empty plate with chopsticks. */
export function EmptyMenu() {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-card px-lg py-2xl text-center ring-1 ring-border">
      <svg aria-hidden="true" viewBox="0 0 160 110" className="h-[110px] w-[160px]">
        <ellipse cx="72" cy="66" rx="58" ry="34" style={{ fill: 'rgb(var(--c-sunken))' }} />
        <ellipse
          cx="72"
          cy="62"
          rx="58"
          ry="34"
          style={{ fill: 'rgb(var(--c-card))', stroke: 'rgb(var(--c-border))', strokeWidth: 2 }}
        />
        <ellipse
          cx="72"
          cy="62"
          rx="38"
          ry="21"
          style={{
            fill: 'none',
            stroke: 'rgb(var(--c-brand) / 0.35)',
            strokeWidth: 2,
            strokeDasharray: '6 5',
          }}
        />
        <path
          d="M118 22 L150 92"
          stroke="rgb(var(--c-primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M128 18 L156 88"
          stroke="rgb(var(--c-brand))"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <p className="mt-md font-heading text-[19px] font-bold text-text">Chưa có món nào</p>
      <p className="mt-1 max-w-[42ch] text-body-md text-muted">
        Món đầu tiên đặt lên kệ sẽ hiện ở đây, đúng như khách thấy trên chợ.
      </p>
    </div>
  );
}

/** Loading: five grey plates, the strip, two dish cards. */
export function MenuSkeleton({ withForm = true }: { withForm?: boolean }) {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex w-full max-w-[1320px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg"
    >
      <span className="sr-only">Đang tải…</span>
      <Skeleton className="h-9 w-40" />
      <PlateRailSkeleton />
      <Skeleton className="h-[76px] w-full rounded-[20px]" />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_380px]">
        <DishCardsSkeleton />
        {withForm ? <Skeleton className="hidden h-[520px] rounded-[28px] xl:block" /> : null}
      </div>
    </div>
  );
}

export function PlateRailSkeleton() {
  return (
    <div className="flex gap-xs rounded-[28px] bg-[#FFF3E8] p-md dark:bg-brand/10 md:gap-md md:p-lg">
      {[0, 1, 2, 3, 4].map((key) => (
        <Skeleton key={key} className="size-16 shrink-0 rounded-full md:size-[88px] xl:size-28" />
      ))}
    </div>
  );
}

export function DishCardsSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[0, 1].map((key) => (
        <div
          key={key}
          className="overflow-hidden rounded-[24px] bg-card ring-1 ring-border md:grid md:grid-cols-[200px_minmax(0,1fr)]"
        >
          <Skeleton className="aspect-[16/9] w-full rounded-none md:aspect-auto md:min-h-[180px]" />
          <div className="flex flex-col gap-sm p-lg">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
