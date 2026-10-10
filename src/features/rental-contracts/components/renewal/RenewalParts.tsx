import { Icon, type IconName } from '@/components/common';
import { contractProgress } from '@/features/sidewalk-slots/my-slots-view';

const DAY_MS = 86_400_000;

/** "2026-12-01" as local midnight, matching contractProgress. */
function localDay(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).getTime();
}

/**
 * The contract's term as a rail, with the asked-for extension growing out of
 * its end in mango hatching. The new end date is not printed here: the ward
 * decides it, and the sentence under the picker already says "if approved in full".
 */
export function RenewalRuler({
  startDate,
  endDate,
  extraDays,
  today,
}: {
  startDate: string;
  endDate: string;
  /** Null while the typed number is empty or invalid. */
  extraDays: number | null;
  today: Date;
}) {
  const progress = contractProgress(startDate, endDate, today);
  const term = Math.max(1, Math.round((localDay(endDate) - localDay(startDate)) / DAY_MS));
  const extra = extraDays ?? 0;
  // The extension never takes more than 3/4 of the rail, so the current term stays readable.
  const extraShare = extra > 0 ? Math.min(0.75, extra / (term + extra)) : 0;
  const currentShare = extraDays ? 1 - extraShare : 0.82;
  const todayAt = currentShare * (progress.percent / 100);
  const label = extraDays
    ? `Thời hạn hiện tại, cộng thêm ${extraDays} ngày đề xuất`
    : 'Thời hạn hiện tại, chưa chọn số ngày gia hạn';

  return (
    <div className="flex flex-col gap-xs">
      <div role="img" aria-label={label} className="relative pt-9">
        <div className="flex h-5 w-full overflow-visible rounded-full">
          <span
            className="relative h-full overflow-hidden rounded-l-full bg-[#E6F6EC] dark:bg-[#10301F]"
            style={{ width: `${currentShare * 100}%` }}
          >
            <span className="block h-full bg-tertiary" style={{ width: `${progress.percent}%` }} />
          </span>
          {extraDays ? (
            <span
              className="relative h-full rounded-r-full border-[1.5px] border-[#B86E00] bg-[repeating-linear-gradient(135deg,#FFB703_0_8px,#FFF4D1_8px_16px)] transition-[width] duration-300 [transition-timing-function:var(--ease-out)]"
              style={{ width: `${extraShare * 100}%` }}
            />
          ) : (
            <span className="relative h-full flex-1 rounded-r-full border-2 border-dashed border-border" />
          )}
        </div>
        <span
          className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-[12px] font-bold text-white"
          style={{ left: `clamp(32px, ${todayAt * 100}%, calc(100% - 140px))` }}
        >
          Hôm nay
        </span>
        {/* Today pin */}
        <span
          aria-hidden="true"
          className="absolute top-7 h-9 w-0.5 -translate-x-1/2 bg-brand"
          style={{ left: `${todayAt * 100}%` }}
        />
        {/* End of the current term */}
        <span
          aria-hidden="true"
          className="absolute top-7 h-9 w-0.5 -translate-x-1/2 bg-text/60"
          style={{ left: `${currentShare * 100}%` }}
        />
        <span
          className={`absolute top-0 whitespace-nowrap rounded-[8px] px-2 py-0.5 font-sign text-[17px] font-bold ${
            extraDays
              ? 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]'
              : 'border border-dashed border-border bg-card text-body-sm text-muted'
          }`}
          style={{ right: 0 }}
        >
          {extraDays ? `+${extraDays} ngày` : 'Chọn số ngày'}
        </span>
      </div>
      <div className="relative h-5 text-[13px] text-muted">
        <span className="absolute left-0">Bắt đầu</span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: `clamp(120px, ${currentShare * 100}%, calc(100% - 56px))` }}
        >
          Hết hạn hiện tại
        </span>
      </div>
    </div>
  );
}

/** Four quick choices as big tabs; each tab's accessible name is exactly "{n} ngày". */
export function TermPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-xs sm:grid-cols-4">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className={[
              'flex h-14 items-baseline justify-center gap-1 rounded-[14px] pt-3 transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98]',
              'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
              active
                ? 'bg-primary text-on-primary shadow-[0_10px_22px_-12px_rgb(var(--c-primary)/0.9)]'
                : 'bg-card text-text ring-1 ring-inset ring-border hover:ring-text/25',
            ].join(' ')}
          >
            <span className="font-sign text-[24px] font-bold leading-none">{opt}</span>{' '}
            <span className={`text-[13px] ${active ? '' : 'text-muted'}`}>ngày</span>
          </button>
        );
      })}
    </div>
  );
}

const STEPS: { icon: IconName; title: string; note?: string }[] = [
  { icon: 'send-outline', title: 'Bạn gửi yêu cầu' },
  {
    icon: 'shield-check-outline',
    title: 'Phường xem xét',
    note: 'Phường quyết định ngày hết hạn mới',
  },
  { icon: 'file-document-outline', title: 'Theo dõi kết quả ở trang chi tiết hợp đồng' },
];

/** What happens after sending, as three small stops (static). */
export function RenewalSteps() {
  return (
    <section className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
      <h2 className="mb-sm font-sign text-[17px] font-bold text-text">Sau khi gửi</h2>
      <ul className="flex flex-col gap-0 md:flex-row md:gap-sm xl:flex-col xl:gap-0">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="relative flex flex-1 gap-sm pb-md last:pb-0 md:pb-0 xl:pb-md"
          >
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[17px] top-10 h-[calc(100%-40px)] w-0.5 bg-brand/30 md:hidden xl:block"
              />
            ) : null}
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint-primary text-primary"
            >
              <Icon name={s.icon} size={18} color="currentColor" />
            </span>
            <span className="min-w-0 pt-1.5">
              <span className="block text-body-md font-semibold leading-snug text-text">
                {s.title}
              </span>
              {s.note ? <span className="block text-body-sm text-muted">{s.note}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
