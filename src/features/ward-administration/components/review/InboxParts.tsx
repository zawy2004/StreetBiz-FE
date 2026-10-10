import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';

import { Icon, KerbTag, type IconName } from '@/components/common';
import { EmptyState, Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { formatDueVi, formatWaitVi } from './format';
import { useGrowOnMount } from './helpers';

/** What the queue board needs of a row; built by InboxScreen, never re-sorted here. */
export type BoardItem = {
  key: string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  riskScore: number;
  reasons: string;
  slotCode?: string;
  submittedAt?: string;
  slaDueAt?: string;
  isOverdue?: boolean;
  onPress: () => void;
};

type Plate = { short: string; label: string; icon: IconName; wash: string; ink: string };

/** Category plates: pale tint + dark ink of the same hue, every pair ≥ 7:1. */
const PLATES: Record<string, Plate> = {
  REG: {
    short: 'ĐK',
    label: 'Đăng ký điểm bán',
    icon: 'file-document-outline',
    wash: 'bg-[#FFF3E8] dark:bg-[#3A2414]',
    ink: 'text-[#8A3200] dark:text-[#FFB98A]',
  },
  RENTAL: {
    short: 'CP',
    label: 'Cấp phép hè phố',
    icon: 'map-marker-radius-outline',
    wash: 'bg-[#E6F6EC] dark:bg-[#10301F]',
    ink: 'text-[#0B5D33] dark:text-[#8BE3B0]',
  },
  RENEWAL: {
    short: 'GH',
    label: 'Gia hạn',
    icon: 'history',
    wash: 'bg-[#FFF3D1] dark:bg-[#3A2A08]',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
  },
  REPORT: {
    short: 'PA',
    label: 'Phản ánh',
    icon: 'flag-outline',
    wash: 'bg-[#FDEBEA] dark:bg-[#3A1414]',
    ink: 'text-[#8F1717] dark:text-[#FF9A90]',
  },
};

/** The category as a small square street plate: initials + glyph, never colour alone. */
export function CategoryPlate({ category }: { category: string }) {
  const plate = PLATES[category] ?? {
    short: category.slice(0, 2),
    label: category,
    icon: 'file-document-outline',
    wash: 'bg-sunken',
    ink: 'text-text',
  };
  return (
    <span
      className={`relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[6px] ${plate.wash} ${plate.ink}`}
    >
      <span className="font-sign text-[18px] font-extrabold leading-none [font-stretch:72%]">
        {plate.short}
      </span>
      <Icon name={plate.icon} size={12} color="currentColor" weight="fill" className="mt-0.5" />
      <span className="sr-only">{plate.label}</span>
    </span>
  );
}

/** Priority as a signal bar scaled to the highest score in the list. */
export function PriorityGauge({ score, max }: { score: number; max: number }) {
  const width = useGrowOnMount(max > 0 ? Math.max(0.08, score / max) : 0);
  if (score <= 0) return <span className="text-[14px] text-muted">Bình thường</span>;
  return (
    <span className="flex flex-col items-start gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-tint-secondary px-2 py-0.5 text-body-xs font-semibold text-on-secondary">
        Cần xem kỹ (+{score}đ)
      </span>
      <span aria-hidden="true" className="block h-1.5 w-24 overflow-hidden rounded-full bg-sunken">
        <span
          className="block h-full rounded-full bg-brand transition-[width] duration-[400ms] [transition-timing-function:var(--ease-out)]"
          style={{ width: `${width * 100}%` }}
        />
      </span>
    </span>
  );
}

function OverdueChip() {
  const t = VERDICT_TONES.danger;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-body-xs font-bold ${t.wash} ${t.ink}`}
    >
      <Icon name="timer-outline" size={13} color="currentColor" />
      Quá hạn
    </span>
  );
}

function WaitLine({ item }: { item: BoardItem }) {
  const wait = formatWaitVi(item.submittedAt);
  const due = item.isOverdue ? null : formatDueVi(item.slaDueAt);
  if (!wait && !due && !item.isOverdue) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-col items-start gap-1 text-[13px] leading-[19px] text-muted">
      {wait ? <span>{wait}</span> : null}
      {item.isOverdue ? <OverdueChip /> : null}
      {due ? <span className="font-medium text-text/80">{due}</span> : null}
    </span>
  );
}

function onKey(item: BoardItem) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      item.onPress();
    }
  };
}

/**
 * The queue as a departures board. Rows keep the order they were given (risk
 * first); the board only splits it where the score drops to zero.
 */
export function QueueBoard({
  items,
  loading,
  emptyTitle,
}: {
  items: BoardItem[];
  loading?: boolean;
  emptyTitle: string;
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  if (loading) return <QueueSkeleton />;
  if (items.length === 0)
    return (
      <div className="rounded-[20px] bg-card shadow-card ring-1 ring-border">
        <EmptyState
          icon="check-circle-outline"
          title={emptyTitle}
          description="Hồ sơ mới sẽ hiện ở đây ngay khi được nộp."
        />
      </div>
    );

  const risky = items.filter((i) => i.riskScore > 0);
  const normal = items.filter((i) => i.riskScore <= 0);
  const max = Math.max(0, ...items.map((i) => i.riskScore));
  const groups = [
    { title: `Cần xem kỹ (${risky.length})`, rows: risky, animate: true },
    { title: `Bình thường (${normal.length})`, rows: normal, animate: false },
  ].filter((g) => g.rows.length > 0);

  return wide ? (
    <div className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">Hồ sơ cần xử lý</caption>
        <thead>
          <tr className="border-b border-border text-body-xs font-semibold text-muted">
            <th scope="col" className="w-[64px] py-sm pl-md">
              <span className="sr-only">Loại</span>
            </th>
            <th scope="col" className="py-sm pl-xs">
              Hồ sơ
            </th>
            <th scope="col" className="hidden py-sm xl:table-cell xl:w-[132px]">
              Mã ô
            </th>
            <th scope="col" className="w-[190px] py-sm xl:w-[210px]">
              Mức ưu tiên
            </th>
            <th scope="col" className="hidden py-sm xl:table-cell xl:w-[150px]">
              Chờ / hạn
            </th>
            <th scope="col" className="w-[150px] py-sm">
              Trạng thái
            </th>
            <th scope="col" className="w-[40px]">
              <span className="sr-only">Mở</span>
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title}>
            {groups.length > 1 || group.animate ? (
              <tr>
                <th
                  scope="colgroup"
                  colSpan={7}
                  className="bg-bg/60 px-md pb-1.5 pt-sm text-left font-sign text-[14px] font-bold text-text"
                >
                  <span className="flex items-center gap-sm">
                    {group.title}
                    <span
                      aria-hidden="true"
                      className="sb-kerb sb-kerb-thin h-[3px] flex-1 rounded-full opacity-70"
                    />
                  </span>
                </th>
              </tr>
            ) : null}
            {group.rows.map((item, index) => (
              <tr
                key={item.key}
                tabIndex={0}
                aria-label={`Mở hồ sơ ${item.title}`}
                onClick={item.onPress}
                onKeyDown={onKey(item)}
                className={`group cursor-pointer border-t border-border align-top transition-colors hover:bg-sunken/70 focus-visible:bg-sunken/70 focus-visible:outline-2 focus-visible:-outline-offset-2 ${group.animate && index < 6 ? 'sb-rise' : ''}`}
                style={
                  group.animate && index < 6
                    ? ({ '--delay': `${index * 40}ms` } as CSSProperties)
                    : undefined
                }
              >
                <td className="py-sm pl-md">
                  <CategoryPlate category={item.category} />
                </td>
                <td className="min-w-0 py-sm pl-xs pr-sm">
                  <p
                    className="truncate text-[16px] font-semibold leading-6 text-text"
                    title={item.title}
                  >
                    {item.title}
                  </p>
                  <p
                    className="truncate text-[14px] leading-[22px] text-muted"
                    title={item.subtitle}
                  >
                    {item.subtitle}
                  </p>
                  {item.reasons ? (
                    <p className="mt-0.5 line-clamp-2 text-body-sm text-on-secondary">
                      Lý do: {item.reasons}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-xs xl:hidden">
                    {item.slotCode ? <KerbTag code={item.slotCode} /> : null}
                    <InlineWait item={item} />
                  </div>
                </td>
                <td className="hidden py-sm xl:table-cell">
                  {item.slotCode ? (
                    <KerbTag code={item.slotCode} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="py-sm pr-sm">
                  <PriorityGauge score={item.riskScore} max={max} />
                </td>
                <td className="hidden py-sm pr-sm xl:table-cell">
                  <WaitLine item={item} />
                </td>
                <td className="py-sm">
                  <StatusChip code={item.status} />
                </td>
                <td className="py-sm pr-sm text-right">
                  <Icon
                    name="chevron-right"
                    size={18}
                    color="currentColor"
                    className="mt-1 text-muted opacity-60 transition-opacity group-hover:opacity-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  ) : (
    <div className="flex flex-col gap-md">
      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-xs">
          {groups.length > 1 || group.animate ? (
            <h3 className="flex items-center gap-sm font-sign text-[15px] font-bold text-text">
              {group.title}
              <span
                aria-hidden="true"
                className="sb-kerb sb-kerb-thin h-[3px] flex-1 rounded-full opacity-70"
              />
            </h3>
          ) : null}
          <ul aria-label="Hồ sơ cần xử lý" className="flex flex-col gap-xs">
            {group.rows.map((item, index) => (
              <li
                key={item.key}
                className={group.animate && index < 6 ? 'sb-rise' : undefined}
                style={
                  group.animate && index < 6
                    ? ({ '--delay': `${index * 40}ms` } as CSSProperties)
                    : undefined
                }
              >
                <button
                  type="button"
                  aria-label={`Mở hồ sơ ${item.title}`}
                  onClick={item.onPress}
                  className="flex min-h-[72px] w-full flex-col gap-xs rounded-[16px] bg-card p-sm text-left shadow-card ring-1 ring-border transition-colors hover:bg-sunken/60"
                >
                  <span className="flex w-full items-start gap-sm">
                    <CategoryPlate category={item.category} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[16px] font-semibold leading-6 text-text">
                        {item.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[14px] leading-[22px] text-muted">
                        {item.subtitle}
                      </span>
                    </span>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color="currentColor"
                      className="mt-1 shrink-0 text-muted"
                    />
                  </span>
                  {item.reasons ? (
                    <span className="line-clamp-2 text-body-sm text-on-secondary">
                      Lý do: {item.reasons}
                    </span>
                  ) : null}
                  <span className="flex flex-wrap items-center gap-xs">
                    {item.slotCode ? <KerbTag code={item.slotCode} /> : null}
                    <InlineWait item={item} />
                  </span>
                  <span className="grid w-full grid-cols-[96px_minmax(0,1fr)] items-center gap-x-sm gap-y-1.5 border-t border-border pt-xs text-[13px] text-muted">
                    <span>Mức ưu tiên</span>
                    <PriorityGauge score={item.riskScore} max={max} />
                    <span>Trạng thái</span>
                    <StatusChip code={item.status} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function InlineWait({ item }: { item: BoardItem }) {
  const wait = formatWaitVi(item.submittedAt);
  const due = item.isOverdue ? null : formatDueVi(item.slaDueAt);
  return (
    <>
      {wait ? <span className="text-[13px] text-muted">{wait}</span> : null}
      {item.isOverdue ? <OverdueChip /> : null}
      {due ? <span className="text-[13px] font-medium text-text/80">{due}</span> : null}
    </>
  );
}

function QueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex h-[72px] items-center gap-sm border-t border-border px-md first:border-t-0"
        >
          <Skeleton className="h-11 w-11 rounded-[6px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="hidden h-6 w-28 md:block" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
      <span role="status" className="sr-only">
        Đang tải…
      </span>
    </div>
  );
}

export type Counter = {
  label: ReactNode;
  value: number;
  tone: 'ink' | 'pending' | 'danger' | 'ai';
  icon?: IconName;
};

/** The head of the queue: how much, how risky, how late, in big signage figures. */
export function InboxCounters({ counters, loading }: { counters: Counter[]; loading?: boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-sm md:grid-cols-4">
      {counters.map((c, i) => {
        const zero = c.value === 0;
        const tone =
          zero || c.tone === 'ink' || c.tone === 'ai'
            ? ''
            : c.tone === 'pending'
              ? `${VERDICT_TONES.pending.wash} ${VERDICT_TONES.pending.ink}`
              : `${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`;
        return (
          <div
            key={i}
            className={`relative flex min-h-[96px] flex-col justify-between gap-xs overflow-hidden rounded-[16px] p-sm pl-md shadow-card ring-1 ring-border md:p-md ${tone || 'bg-card text-text'}`}
          >
            {c.tone === 'ai' ? (
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px] bg-secondary" />
            ) : null}
            <dt className="flex items-center gap-1.5 text-[14px] font-medium leading-5">
              {c.icon ? <Icon name={c.icon} size={16} color="currentColor" /> : null}
              {c.label}
            </dt>
            <dd className="flex items-center gap-xs font-sign text-[36px] font-extrabold leading-none [font-stretch:88%] font-tabular md:text-[40px]">
              {loading ? <Skeleton className="h-9 w-14" /> : c.value}
              {!loading && i === 0 && zero ? (
                <Icon
                  name="check-circle"
                  size={22}
                  color="currentColor"
                  className="text-tertiary"
                />
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Two small sidewalk pavers and a pin: the slot-side review queue. */
function SlotsPictogram() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
      <rect
        x="3"
        y="20"
        width="18"
        height="18"
        rx="3"
        className="fill-none stroke-text"
        strokeWidth="2"
      />
      <rect
        x="25"
        y="20"
        width="18"
        height="18"
        rx="3"
        className="fill-[rgb(var(--c-brand)/0.14)] stroke-brand"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <rect x="0" y="41" width="48" height="4" rx="1" className="fill-brand" />
      <path
        d="M34 4c-4.4 0-8 3.4-8 7.7 0 5.6 8 13.3 8 13.3s8-7.7 8-13.3C42 7.4 38.4 4 34 4z"
        className="fill-primary"
      />
      <circle cx="34" cy="11.5" r="3" className="fill-card" />
    </svg>
  );
}

/** A rice bowl under a shield: food-safety files. */
function FoodSafetyPictogram() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
      <path d="M6 24h28a14 14 0 0 1-28 0z" className="fill-[#FFF3D1] stroke-text" strokeWidth="2" />
      <path d="M10 24c2-5 6-7 10-7s8 2 10 7" className="fill-none stroke-text" strokeWidth="2" />
      <rect x="12" y="38" width="16" height="3" rx="1.5" className="fill-text" />
      <path d="M36 14l8 3v7c0 6-3.6 9.6-8 11-4.4-1.4-8-5-8-11v-7z" className="fill-tertiary" />
      <path
        d="M32.5 24l2.5 2.5 4.5-5"
        className="fill-none stroke-white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The two signposts out of the inbox (live only), set like road direction signs. */
export function InboxSignposts({
  onSlots,
  onFoodSafety,
}: {
  onSlots: () => void;
  onFoodSafety: () => void;
}) {
  const signs = [
    {
      key: 'slots',
      art: <SlotsPictogram />,
      title: 'Hồ sơ vị trí',
      text: 'Đề xuất ô, xung đột địa chỉ, chuyển nhượng và kiểm tra ranh giới',
      onPress: onSlots,
    },
    {
      key: 'food',
      art: <FoodSafetyPictogram />,
      title: 'Hồ sơ an toàn thực phẩm (ATTP)',
      text: 'Xét hồ sơ, chuyển Chi cục ATTP kiểm tra và cập nhật kết quả',
      onPress: onFoodSafety,
    },
  ];
  return (
    <nav aria-label="Hồ sơ khác" className="grid gap-sm md:grid-cols-2 xl:grid-cols-1">
      {signs.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={s.onPress}
          className="group relative flex min-h-[88px] items-center gap-sm overflow-hidden rounded-[16px] bg-card p-sm pl-md text-left shadow-card ring-1 ring-border transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px] bg-brand" />
          <span className="shrink-0 transition-transform group-hover:translate-x-0.5">{s.art}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold leading-6 text-text">{s.title}</span>
            <span className="mt-0.5 block text-[13px] leading-[19px] text-muted">{s.text}</span>
          </span>
          <Icon
            name="chevron-right"
            size={20}
            color="currentColor"
            className="shrink-0 text-muted"
          />
        </button>
      ))}
    </nav>
  );
}

/** How the queue is ordered, in the officer's words (static, matches the code). */
export function PriorityExplainer({ live }: { live: boolean }) {
  return (
    <details className="group rounded-[14px] bg-card ring-1 ring-border open:shadow-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-sm text-body-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
        <Icon name="information-outline" size={17} color="currentColor" className="text-primary" />
        Cách xếp ưu tiên
        <Icon
          name="chevron-down"
          size={16}
          color="currentColor"
          className="text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="flex flex-col gap-1 px-md pb-sm text-body-sm text-text/80">
        {live ? (
          <>
            <li>+20đ cho mỗi vi phạm trong hợp đồng của hồ sơ gia hạn.</li>
            <li>+100đ khi hồ sơ gia hạn quá hạn xử lý (NĐ 241/2026, ≤3 ngày làm việc).</li>
            <li>Điểm của hồ sơ đăng ký do hệ thống chấm theo lịch sử điểm bán.</li>
          </>
        ) : (
          <li>Dữ liệu giả lập: điểm ưu tiên chỉ để minh họa cách xếp hàng.</li>
        )}
        <li>Hồ sơ có điểm cao hơn được xếp lên trước.</li>
      </ul>
    </details>
  );
}
