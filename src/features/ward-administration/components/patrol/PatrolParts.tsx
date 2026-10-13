import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { PermitStamp as Stamp, VERDICT_TONES } from '@/components/illustrations';
import { statusLabel } from '@/core/constants/status-labels';
import type { WardPatrolHeatmapPoint } from '../../ward-api';

const VERDICT = VERDICT_TONES;

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

type BoardProps = {
  vendorName: string;
  code: string;
  effectiveStatus: string;
  slotCode: string;
  slotStreet: string;
  /** When this result came back from the server; null in demo (mock) mode. */
  checkedAt: Date | null;
  /** A newer lookup is running while this (older) result is still shown. */
  refreshing: boolean;
  details: ReactNode;
  hints: ReactNode;
  actions: ReactNode;
  /** Bands about how current this result is (a later lookup failed, the code was edited). */
  notice?: ReactNode;
};

/**
 * The result as a permit pass: the painted kerb along its top edge, the slot
 * plate, the verdict in large words on a pale wash of its colour, and the ward
 * stamp coming down beside it once per lookup. Then who it belongs to, when it
 * was looked up, what to do, and the facts.
 */
export function PermitVerdictBoard({
  vendorName,
  code,
  effectiveStatus,
  slotCode,
  slotStreet,
  checkedAt,
  refreshing,
  details,
  hints,
  actions,
  notice,
}: BoardProps) {
  const { label, tone } = statusLabel(effectiveStatus);
  const verdict = VERDICT[tone];

  return (
    <section
      aria-label="Kết quả tra cứu giấy phép"
      aria-live="polite"
      className="sb-pop overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />

      <div
        className={`relative overflow-hidden px-md pb-md pt-md md:px-lg md:pb-lg ${verdict.wash}`}
      >
        <div className="relative z-10 flex flex-wrap items-center gap-sm pr-[104px] md:pr-[150px]">
          <span className="flex h-12 items-center rounded-[8px] bg-card px-sm font-sign text-[30px] font-extrabold leading-none tracking-[0.03em] text-text ring-[2.5px] ring-text [font-stretch:66%]">
            {slotCode || '—'}
          </span>
          <span className="min-w-0 text-body-md font-medium leading-tight text-text/75">
            {slotStreet}
          </span>
          {refreshing ? (
            <span className="flex items-center gap-1.5 rounded-full bg-card px-sm py-1 text-body-xs font-semibold text-text shadow-card">
              <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              Đang kiểm tra lại…
            </span>
          ) : null}
        </div>

        <div className={`relative z-10 mt-md flex items-center gap-sm ${verdict.ink}`}>
          <Icon name={verdict.icon} size={44} color="currentColor" weight="fill" />
          <p className="font-sign text-[40px] font-extrabold leading-none tracking-[-0.01em] [font-stretch:88%] md:text-[52px]">
            {label}
          </p>
        </div>

        <Stamp
          key={checkedAt?.getTime() ?? code}
          icon={verdict.icon}
          inkClass={verdict.ink}
          strokeClass={verdict.stroke}
          className="absolute -right-2 top-3 h-[112px] w-[112px] md:right-md md:top-md md:h-[136px] md:w-[136px]"
        />
      </div>

      <div className="flex flex-col gap-md p-md md:p-lg">
        {notice}
        <div className="flex flex-col gap-1">
          <p className="text-[22px] font-semibold leading-snug tracking-[-0.01em] text-text">
            {vendorName}
          </p>
          <p className="text-body-md text-muted">
            Mã giấy phép:{' '}
            <span className="font-sign font-semibold tracking-[0.02em] text-text">{code}</span>
          </p>
          <p className="flex items-center gap-1.5 text-body-sm text-muted">
            <Icon name="clock-outline" size={15} color="currentColor" />
            {checkedAt
              ? `Tra cứu trực tiếp với máy chủ lúc ${timeFormat.format(checkedAt)}`
              : 'Chế độ dữ liệu mẫu, không tra cứu máy chủ'}
          </p>
        </div>
        <div className="grid gap-sm sm:grid-cols-2">{actions}</div>
        {details}
        {hints}
      </div>
    </section>
  );
}

/** Label/value rows for the permit facts; `extra` sits beside the value (e.g. the validity ring). */
export function PermitFacts({
  rows,
}: {
  rows: { label: string; value: string; note?: ReactNode; extra?: ReactNode }[];
}) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-[16px] bg-border ring-1 ring-border sm:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-sm bg-card p-sm md:p-md"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-body-xs text-muted">{row.label}</dt>
            <dd className="text-[17px] font-semibold leading-snug text-text">{row.value}</dd>
            {row.note ? <dd className="text-body-sm font-medium">{row.note}</dd> : null}
          </div>
          {row.extra}
        </div>
      ))}
    </dl>
  );
}

/** "còn N ngày" / "hết hạn hôm nay" / "đã quá hạn N ngày", in the verdict ink for its urgency. */
export function ValidityNote({ daysLeft }: { daysLeft: number }) {
  const tone = daysLeft < 0 ? VERDICT.danger : daysLeft <= 30 ? VERDICT.pending : VERDICT.ok;
  const text =
    daysLeft > 0
      ? `còn ${daysLeft} ngày`
      : daysLeft === 0
        ? 'hết hạn hôm nay'
        : `đã quá hạn ${-daysLeft} ngày`;
  return <span className={tone.ink}>{text}</span>;
}

/**
 * A 48px ring of the validity period: the used part in muted grey, what is left
 * in the colour of its urgency. Decoration; the days are said in words beside it.
 */
export function ValidityRing({ used, daysLeft }: { used: number; daysLeft: number }) {
  const tone = daysLeft < 0 ? VERDICT.danger : daysLeft <= 30 ? VERDICT.pending : VERDICT.ok;
  const r = 19;
  const c = 2 * Math.PI * r;
  const left = Math.max(0, 1 - used);
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-12 w-12 shrink-0 -rotate-90">
      <circle cx="24" cy="24" r={r} fill="none" strokeWidth="6" className="stroke-muted/30" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${c * left} ${c}`}
        strokeDashoffset={-c * used}
        className={`${tone.stroke} transition-[stroke-dasharray] duration-700`}
      />
    </svg>
  );
}

/**
 * A band inside the result board saying how far to trust what is on screen.
 * Mango tone, not red, so it never reads as a "violation" verdict.
 */
export function ResultNotice({ icon, children }: { icon: IconName; children: ReactNode }) {
  const tone = VERDICT.pending;
  return (
    <div
      role="status"
      className={`sb-pop flex items-start gap-sm rounded-[14px] px-sm py-sm ring-1 ring-[#6B4100]/25 dark:ring-[#FFD27A]/25 ${tone.wash}`}
    >
      <Icon
        name={icon}
        size={22}
        color="currentColor"
        weight="fill"
        className={`mt-px shrink-0 ${tone.ink}`}
      />
      <p className={`text-body-md font-semibold leading-snug ${tone.ink}`}>{children}</p>
    </div>
  );
}

/**
 * The [AI] encroachment estimate drawn from above: the painted slot outline and
 * the stall pushing past it by the estimated distance. Illustration of a
 * suggestion only; the words in the hint carry the content.
 */
export function EncroachmentSketch({ distanceCm }: { distanceCm: number }) {
  const over = Math.min(70, Math.max(14, distanceCm * 0.9));
  return (
    <figure className="mt-sm flex flex-col gap-1">
      <svg
        aria-hidden="true"
        viewBox="0 0 260 92"
        className="h-[92px] w-full max-w-[320px] rounded-[12px] bg-card"
      >
        <rect y="0" width="260" height="14" className="fill-[#E9EDF1] dark:fill-[#1D2833]" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={i * 22}
            y="14"
            width="22"
            height="5"
            className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
          />
        ))}
        <rect
          x="40"
          y="30"
          width="110"
          height="50"
          rx="6"
          fill="none"
          strokeWidth="2.5"
          strokeDasharray="7 5"
          className="stroke-[#0B7F43] dark:stroke-[#8BE3B0]"
        />
        <rect
          x="58"
          y="40"
          width={92 + over}
          height="30"
          rx="5"
          className="fill-[#B42318]/20 stroke-[#B42318] dark:stroke-[#FF9A90]"
          strokeWidth="2"
        />
        <path
          d={`M150 84 H${150 + over}`}
          strokeWidth="2"
          className="stroke-[#8F1717] dark:stroke-[#FF9A90]"
        />
        <path
          d={`M150 79 V89 M${150 + over} 79 V89`}
          strokeWidth="2"
          className="stroke-[#8F1717] dark:stroke-[#FF9A90]"
        />
        <text
          x={156 + over}
          y="60"
          className="fill-[#8F1717] font-sign text-[15px] font-extrabold dark:fill-[#FF9A90]"
        >
          {distanceCm} cm
        </text>
      </svg>
      <figcaption className="text-body-xs text-muted">
        Phác hoạ theo ước lượng [AI]: vật dụng vượt vạch ô khoảng {distanceCm} cm.
      </figcaption>
    </figure>
  );
}

/** First lookup in flight: the pass's outline, so nothing jumps when it lands. */
export function VerdictSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang kiểm tra giấy phép"
      className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md bg-sunken/60 p-lg">
        <Skeleton className="h-12 w-[150px]" />
        <Skeleton className="h-12 w-1/2" />
      </div>
      <div className="flex flex-col gap-sm p-lg">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-xs grid gap-sm sm:grid-cols-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Nothing matched: a pass with a dashed red edge, the place where a permit should be.
 * `notice` sits above it when the lookup itself failed, so a network error is not read as "invalid".
 */
export function NotFoundBoard({ notice }: { notice?: ReactNode }) {
  const tone = VERDICT.danger;
  return (
    <section
      aria-label="Kết quả tra cứu giấy phép"
      aria-live="polite"
      className="flex flex-col gap-sm"
    >
      {notice}
      <NotFoundPass tone={tone} />
    </section>
  );
}

function NotFoundPass({ tone }: { tone: (typeof VERDICT)['danger'] }) {
  return (
    <div
      className={`sb-pop relative flex flex-col items-center gap-sm overflow-hidden rounded-[28px] border-2 border-dashed border-[#8F1717]/45 px-lg py-2xl text-center dark:border-[#FF9A90]/45 ${tone.wash}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-card ${tone.ink}`}
      >
        <Icon name="qrcode-remove" size={34} color="currentColor" />
      </span>
      <p
        className={`font-sign text-[28px] font-extrabold leading-tight [font-stretch:90%] ${tone.ink}`}
      >
        Không tìm thấy giấy phép
      </p>
      <p className="max-w-[44ch] text-body-md text-text/75">
        Mã không hợp lệ, chưa được cấp hoặc đã hết hiệu lực trên hệ thống máy chủ.
      </p>
    </div>
  );
}

const STEPS = [
  {
    icon: 'qrcode-scan' as IconName,
    text: 'Nhập mã in trên giấy phép hoặc dán nội dung mã QR ở quầy.',
  },
  {
    icon: 'cloud-check-outline' as IconName,
    text: 'Bấm Kiểm tra: hệ thống tra trực tiếp với máy chủ, không dùng bản lưu.',
  },
  {
    icon: 'clipboard-text-outline' as IconName,
    text: 'Thấy sai phạm thì lập biên bản hoặc đình chỉ ngay từ kết quả.',
  },
];

/** Before any lookup: an empty pass waiting for its stamp, and the three steps of a check. */
export function PatrolIdle() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border">
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-lg p-lg md:flex-row md:items-center md:gap-xl md:p-xl">
        <div
          aria-hidden="true"
          className="relative mx-auto flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-brand/50 bg-tint-primary md:mx-0"
        >
          <span className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-card text-primary shadow-card">
            <Icon name="shield-check-outline" size={44} color="currentColor" weight="duotone" />
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-md">
          <div className="flex flex-col gap-1">
            <p className="font-sign text-[26px] font-extrabold leading-tight text-text [font-stretch:90%]">
              Sẵn sàng kiểm tra
            </p>
            <p className="text-body-md text-muted">Ba bước cho mỗi quầy trên tuyến tuần tra.</p>
          </div>
          <ol className="flex flex-col gap-sm">
            {STEPS.map((step, i) => (
              <li key={step.text} className="flex items-start gap-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[15px] font-bold text-on-primary">
                  {i + 1}
                </span>
                <span className="pt-1 text-body-md leading-snug text-text">{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

const DAY_NAMES = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/**
 * Up to four hot spots from violation history, busiest first as the API sends
 * them: when (large, so the shift can be planned at a glance), where, and a
 * bar scaled to the busiest one.
 */
export function PatrolHeatmap({ points }: { points: WardPatrolHeatmapPoint[] }) {
  const shown = points.slice(0, 4);
  const peak = Math.max(...shown.map((p) => p.violationCount), 1);
  return (
    <ul className="grid grid-cols-1 gap-sm sm:grid-cols-2 xl:grid-cols-4">
      {shown.map((pt, idx) => (
        <li
          key={idx}
          className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
        >
          <div className="flex items-start justify-between gap-xs">
            <div className="min-w-0">
              <p className="font-sign text-[22px] font-extrabold leading-none text-text [font-stretch:86%]">
                {pt.hourOfDay}:00 - {pt.hourOfDay + 1}:00
              </p>
              <p className="mt-1 text-body-sm font-medium text-muted">
                {DAY_NAMES[pt.dayOfWeek % 7]}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#FDEBEA] px-2.5 py-1 text-body-xs font-bold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
              {pt.violationCount} vi phạm
            </span>
          </div>
          <p className="flex min-w-0 items-center gap-1.5 text-body-md font-semibold text-text">
            <Icon
              name="map-marker-outline"
              size={16}
              color="currentColor"
              className="shrink-0 text-primary"
            />
            <span className="truncate" title={pt.zoneName || 'Tuyến phố chính'}>
              {pt.zoneName || 'Tuyến phố chính'}
            </span>
          </p>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-brand"
              style={{ width: `${(pt.violationCount / peak) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Monday first, the way a duty roster reads; `dayOfWeek` from the API has 0 = Sunday. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Every heatmap point on one week grid: a row per day, a column per hour that
 * has any violations, each cell tinted by its count against the busiest one.
 * Several zones in the same hour add up. Seven rows even when data is thin.
 */
export function PatrolWeekGrid({ points }: { points: WardPatrolHeatmapPoint[] }) {
  const counts = new Map<string, number>();
  for (const pt of points) {
    const key = `${pt.dayOfWeek % 7}-${pt.hourOfDay}`;
    counts.set(key, (counts.get(key) ?? 0) + pt.violationCount);
  }
  const hours = [...new Set(points.map((p) => p.hourOfDay))].sort((a, b) => a - b);
  const peak = Math.max(...counts.values(), 1);

  return (
    <div className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border">
      <div className="flex flex-wrap items-baseline justify-between gap-xs px-md pt-md">
        <p className="font-sign text-[18px] font-bold text-text [font-stretch:90%]">
          Cả tuần theo giờ
        </p>
        <p className="text-body-sm text-muted">Ô càng đậm, càng nhiều vi phạm</p>
      </div>
      <div className="overflow-x-auto px-md pb-md pt-sm">
        <table className="w-full border-separate border-spacing-1 font-tabular">
          <caption className="sr-only">Số vi phạm theo thứ trong tuần và khung giờ</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[84px]">
                <span className="sr-only">Thứ</span>
              </th>
              {hours.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="min-w-[44px] pb-1 text-center text-body-xs font-semibold text-muted"
                >
                  {h}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEK_ORDER.map((day) => (
              <tr key={day}>
                <th
                  scope="row"
                  className="whitespace-nowrap pr-xs text-left text-body-sm font-semibold text-text"
                >
                  {DAY_NAMES[day]}
                </th>
                {hours.map((h) => {
                  const n = counts.get(`${day}-${h}`) ?? 0;
                  return (
                    <td
                      key={h}
                      className={`h-10 rounded-[8px] text-center text-body-sm font-bold text-text ${n ? '' : 'bg-sunken/70'}`}
                      style={
                        n
                          ? { backgroundColor: `rgb(var(--c-brand) / ${0.18 + (n / peak) * 0.62})` }
                          : undefined
                      }
                    >
                      {n || <span className="sr-only">0</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
