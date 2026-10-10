import type { ReactNode } from 'react';

import { Icon, KerbTag, type IconName } from '@/components/common';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import { canAnimate } from './format';
import { useGrowOnMount } from './helpers';

/* ---------------------------------------------------------------- shared */

type ReceiptRow = { label: ReactNode; value: ReactNode };

/**
 * A fee slip with a torn top edge. Figures sit right-aligned in tabular Archivo;
 * the total is the one big number (ink, not orange: it must read at 7:1).
 */
export function FeeReceipt({
  title,
  rows,
  totalLabel,
  totalValue,
  totalAria,
  footnotes,
}: {
  title: string;
  rows: ReceiptRow[];
  totalLabel: string;
  totalValue: string;
  totalAria: string;
  footnotes?: ReactNode;
}) {
  const torn = {
    WebkitMaskImage: 'radial-gradient(circle 6px at 50% 0, transparent 97%, #000)',
    maskImage: 'radial-gradient(circle 6px at 50% 0, transparent 97%, #000)',
    WebkitMaskSize: '18px 100%',
    maskSize: '18px 100%',
    WebkitMaskRepeat: 'repeat-x',
    maskRepeat: 'repeat-x',
  } as const;
  return (
    <section
      aria-label={title}
      style={torn}
      className="flex flex-col gap-sm bg-card px-md pb-md pt-lg shadow-card ring-1 ring-border md:px-lg md:pb-lg"
    >
      <h2 className="flex items-center gap-xs font-sign text-[17px] font-bold leading-tight text-text">
        <Icon
          name="receipt-text-outline"
          size={19}
          color="currentColor"
          className="shrink-0 text-primary"
        />
        {title}
      </h2>
      <dl className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-baseline justify-between gap-sm">
            <dt className="text-[14px] text-muted">{row.label}</dt>
            <dd className="text-right font-sign text-[16px] font-semibold text-text font-tabular">
              {row.value}
            </dd>
          </div>
        ))}
        <div aria-hidden="true" className="my-1 border-t-2 border-dashed border-border" />
        <div className="flex flex-col gap-0.5">
          <dt className="text-[14px] font-semibold text-text">{totalLabel}</dt>
          <dd
            aria-label={totalAria}
            className="sb-pop text-right font-sign text-[30px] font-extrabold leading-[36px] tracking-[-0.01em] text-text font-tabular"
          >
            {totalValue}
          </dd>
        </div>
      </dl>
      {footnotes ? (
        <div className="flex flex-col gap-1 text-body-sm text-muted">{footnotes}</div>
      ) : null}
    </section>
  );
}

/** A prohibition sign with a padlock: the decision cannot pass until these clear. */
export function PrerequisiteLock({
  id,
  title,
  blockers,
  children,
}: {
  id?: string;
  title: string;
  blockers: string[];
  children?: ReactNode;
}) {
  const t = VERDICT_TONES.danger;
  return (
    <section
      id={id}
      aria-label={title}
      className={`flex flex-col gap-sm rounded-[24px] border-2 border-[#8F1717]/25 p-md md:flex-row md:gap-md md:p-lg dark:border-[#FF9A90]/30 ${t.wash}`}
    >
      <span
        aria-hidden="true"
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[4px] border-current bg-card ${t.ink}`}
      >
        <Icon name="lock-outline" size={24} color="currentColor" weight="fill" />
        <span className="absolute h-[4px] w-[64px] rotate-[-40deg] rounded-full bg-current opacity-80" />
      </span>
      <div className={`flex min-w-0 flex-1 flex-col gap-xs ${t.ink}`}>
        <p className="flex items-center gap-xs font-sign text-[18px] font-bold leading-tight">
          <Icon name="block-helper" size={19} color="currentColor" className="shrink-0" />
          {title}
        </p>
        <ul className="flex flex-col gap-1 text-[15px] leading-[23px]">
          {blockers.map((b, i) => (
            <li key={i} className="flex items-start gap-xs">
              <span
                aria-hidden="true"
                className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-current"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ W06 */

const ISSUES: { icon: IconName; label: string }[] = [
  { icon: 'file-document-outline', label: 'Hợp đồng điện tử' },
  { icon: 'qrcode', label: 'Giấy phép số QR' },
  { icon: 'receipt-text-outline', label: 'Lịch thu phí' },
];

/** What the server issues on approval (BR-17). Pictograms only: no code, no QR is drawn. */
export function IssuanceStrip({ ready }: { ready: boolean }) {
  return (
    <section
      aria-label="Khi duyệt, máy chủ sẽ phát hành"
      className={`flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card md:p-lg ${ready ? 'ring-2 ring-tertiary/60' : 'ring-1 ring-border'}`}
    >
      <p className="text-[15px] font-semibold text-text">Khi duyệt, máy chủ sẽ phát hành:</p>
      <ul className="grid grid-cols-3 gap-xs md:gap-sm">
        {ISSUES.map((item) => (
          <li
            key={item.label}
            className="flex flex-col items-center gap-xs rounded-[14px] bg-sunken/60 p-sm text-center md:flex-row md:text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-tint-tertiary text-tertiary">
              <Icon name={item.icon} size={24} color="currentColor" weight="duotone" />
            </span>
            <span className="text-body-sm font-semibold leading-tight text-text">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const num = (n: number) => n.toLocaleString('vi-VN');

/**
 * The requested slot from above, to its real proportions: house edge, the
 * pedestrian lane that must stay clear, the slot, the painted kerb, the road.
 * Only drawn from real width/length; no area is printed on it.
 */
export function SlotPlanDiagram({
  slotCode,
  street,
  width,
  length,
  ready,
  highlight,
}: {
  slotCode: string;
  street: string;
  width: number | null;
  length: number | null;
  ready: boolean;
  highlight: boolean;
}) {
  const sized = ready && !!width && !!length && width > 0 && length > 0;
  const W = 640;
  const box = { x: 120, y: 118, w: 400, h: 108 };
  const scale = sized ? Math.min(box.w / length!, box.h / width!) : 1;
  const rw = sized ? length! * scale : 120;
  const rh = sized ? width! * scale : 80;
  const rx = box.x + (box.w - rw) / 2;
  const ry = box.y + (box.h - rh) / 2;
  const animate = sized && canAnimate();
  const dimStroke = highlight ? 3 : 2;
  const label = sized
    ? `Sơ đồ ô ${slotCode}: rộng ${num(width!)} mét, dài ${num(length!)} mét, chừa lối đi bộ tối thiểu 1,5 mét`
    : `Sơ đồ ô ${slotCode}: chưa có kích thước ô`;
  return (
    <section className="flex flex-col gap-sm overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-xs px-md pt-md md:px-lg md:pt-lg">
        {slotCode ? <KerbTag code={slotCode} /> : null}
        <span
          className="min-w-0 max-w-full truncate text-[15px] font-semibold text-text"
          title={street}
        >
          {street ? `Đường ${street}` : ''}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} 320`}
        role="img"
        aria-label={label}
        className="block aspect-[2/1] w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id="sb-walk-hatch"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="10" height="10" className="fill-card" />
            <line x1="0" y1="0" x2="0" y2="10" className="stroke-border" strokeWidth="3" />
          </pattern>
        </defs>
        {/* house edge */}
        <rect x="0" y="0" width={W} height="34" className="fill-[#E9EDF1] dark:fill-[#1D2833]" />
        <text x="16" y="23" className="fill-muted" fontSize="13">
          mép nhà
        </text>
        {/* pedestrian lane */}
        <rect x="0" y="34" width={W} height="64" fill="url(#sb-walk-hatch)" />
        <rect x="200" y="52" width="240" height="28" rx="8" className="fill-card" />
        <text
          x="320"
          y="71"
          textAnchor="middle"
          className="fill-text font-sign"
          fontSize="15"
          fontWeight="700"
        >
          Lối đi bộ tối thiểu 1.5m
        </text>
        {/* pavement band where the slot sits */}
        <rect x="0" y="98" width={W} height="148" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
        {/* the requested slot */}
        <rect
          x={rx}
          y={ry}
          width={rw}
          height={rh}
          rx="6"
          className={
            sized ? 'fill-[rgb(var(--c-brand)/0.14)] stroke-brand' : 'fill-none stroke-muted/50'
          }
          strokeWidth={sized ? 3 : 2}
          strokeDasharray={sized ? undefined : '8 6'}
        />
        {sized ? (
          <rect
            x={rx - 6}
            y={ry - 6}
            width={rw + 12}
            height={rh + 12}
            rx="10"
            className="sb-slot-beacon fill-none stroke-brand"
            strokeWidth="2"
            style={{ animationIterationCount: 2 }}
          />
        ) : (
          <text
            x={box.x + box.w / 2}
            y={box.y + box.h / 2 + 5}
            textAnchor="middle"
            className="fill-muted"
            fontSize="14"
          >
            Chưa có kích thước ô
          </text>
        )}
        {sized ? (
          <g className={highlight ? 'text-primary' : 'text-text'}>
            {/* length along the street */}
            <DimLine
              x1={rx}
              y1={ry + rh + 16}
              x2={rx + rw}
              y2={ry + rh + 16}
              stroke={dimStroke}
              animate={animate}
              text={`${num(length!)} m`}
            />
            {/* width across the pavement */}
            <DimLine
              x1={rx + rw + 18}
              y1={ry}
              x2={rx + rw + 18}
              y2={ry + rh}
              stroke={dimStroke}
              animate={animate}
              text={`${num(width!)} m`}
              vertical
            />
          </g>
        ) : null}
        {/* painted kerb */}
        {Array.from({ length: Math.ceil(W / 32) }, (_, i) => (
          <rect
            key={i}
            x={i * 32}
            y="246"
            width="32"
            height="12"
            className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
          />
        ))}
        {/* road */}
        <rect x="0" y="258" width={W} height="62" className="fill-[#E9EDF1] dark:fill-[#1D2833]" />
        <path
          d={`M0 290 H${W}`}
          strokeDasharray="22 16"
          strokeWidth="3"
          className="stroke-white/90 dark:stroke-white/25"
        />
        <text x={W - 16} y="312" textAnchor="end" className="fill-muted" fontSize="13">
          lòng đường
        </text>
      </svg>
    </section>
  );
}

function DimLine({
  x1,
  y1,
  x2,
  y2,
  text,
  stroke,
  animate,
  vertical,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  stroke: number;
  animate: boolean;
  vertical?: boolean;
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const a = 7;
  const head = vertical
    ? `M${x1 - a} ${y1 + a} L${x1} ${y1} L${x1 + a} ${y1 + a} M${x2 - a} ${y2 - a} L${x2} ${y2} L${x2 + a} ${y2 - a}`
    : `M${x1 + a} ${y1 - a} L${x1} ${y1} L${x1 + a} ${y1 + a} M${x2 - a} ${y2 - a} L${x2} ${y2} L${x2 - a} ${y2 + a}`;
  const labelW = Math.max(52, text.length * 10 + 16);
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={len}
        strokeDashoffset={0}
      >
        {animate ? (
          <animate attributeName="stroke-dashoffset" from={len} to="0" dur="0.6s" fill="freeze" />
        ) : null}
      </line>
      <path d={head} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <rect
        x={vertical ? mx + 6 : mx - labelW / 2}
        y={vertical ? my - 14 : my - 14}
        width={labelW}
        height="28"
        rx="7"
        className="fill-card stroke-border"
      />
      <text
        x={vertical ? mx + 6 + labelW / 2 : mx}
        y={my + 6}
        textAnchor="middle"
        className="fill-text font-sign"
        fontSize="16"
        fontWeight="700"
      >
        {text}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ W07 */

function dayIndex(d: Date) {
  return Math.floor(d.getTime() / 86_400_000);
}

/**
 * The contract as a ruler on the kerb: the current term in ink, the requested
 * extension in painted orange, today as a dashed tick. Not drawn when a date
 * cannot be read; the screen still prints both dates in words.
 */
export function ContractTimeline({
  currentEnd,
  proposedEnd,
  currentLabel,
  proposedLabel,
  remainingDays,
  termDays,
  isOpen,
}: {
  currentEnd: string;
  proposedEnd: string;
  currentLabel: string;
  proposedLabel: string;
  remainingDays: number;
  termDays: number;
  isOpen: boolean;
}) {
  const cur = currentEnd ? new Date(currentEnd) : null;
  const next = proposedEnd ? new Date(proposedEnd) : null;
  const valid = !!cur && !!next && !Number.isNaN(cur.getTime()) && !Number.isNaN(next.getTime());
  const grown = useGrowOnMount(valid ? 1 : 0);
  if (!valid) return null;

  const today = dayIndex(new Date());
  const c = dayIndex(cur!);
  const n = dayIndex(next!);
  const start = Math.min(today, c);
  const end = Math.max(n, today, c + 1);
  const span = Math.max(1, end - start);
  const pos = (d: number) => ((d - start) / span) * 100;
  const soon = remainingDays > 0 && remainingDays <= 7;
  const expired = remainingDays <= 0 && isOpen;
  const aria = `Hợp đồng hết hạn ${currentLabel}, đề nghị gia hạn thêm ${termDays} ngày tới ${proposedLabel}, còn ${Math.max(0, remainingDays)} ngày`;

  return (
    <div role="img" aria-label={aria} className="flex flex-col gap-sm">
      {/* horizontal ruler (≥ 640px) */}
      <div className="relative hidden h-[120px] sm:block">
        <span
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-sign text-[22px] font-bold text-[#8A3200] dark:text-[#FFB98A]"
          style={{ left: `${Math.min(88, Math.max(12, (pos(c) + pos(n)) / 2))}%` }}
        >
          +{termDays} ngày
        </span>
        <div className="absolute inset-x-0 top-[44px] h-3 rounded-full bg-sunken">
          {soon ? (
            <span
              className="absolute inset-y-[-6px] rounded-[6px] bg-[#FDEBEA] dark:bg-[#3A1414]"
              style={{ left: `${pos(today)}%`, width: `${pos(c) - pos(today)}%` }}
            />
          ) : null}
          <span
            className="absolute inset-y-0 left-0 rounded-l-full bg-text"
            style={{ width: `${pos(c)}%` }}
          />
          <span
            className="absolute inset-y-0 origin-left rounded-r-full transition-transform duration-700 [transition-timing-function:var(--ease-out)]"
            style={{
              left: `${pos(c)}%`,
              width: `${pos(n) - pos(c)}%`,
              transform: `scaleX(${grown})`,
              background:
                'repeating-linear-gradient(90deg, rgb(var(--c-brand)) 0 14px, rgb(var(--c-kerb-paint)) 14px 18px)',
            }}
          />
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card bg-text shadow-card"
            style={{ left: `${pos(c)}%` }}
          />
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card bg-brand shadow-card"
            style={{ left: `${pos(n)}%` }}
          />
          <span
            className="absolute -top-3 h-[36px] w-0 border-l-2 border-dashed border-text/60"
            style={{ left: `${pos(today)}%` }}
            title="Hôm nay"
          />
        </div>
        <span
          className="absolute top-[64px] -translate-x-1/2 whitespace-nowrap text-body-xs font-semibold text-muted"
          style={{ left: `${Math.min(92, Math.max(6, pos(today)))}%` }}
        >
          Hôm nay
        </span>
        <div className="absolute inset-x-0 top-[84px] flex justify-between gap-sm text-[14px]">
          <span className="text-text">
            Hết hạn hiện tại{' '}
            <span className="font-sign text-[18px] font-bold font-tabular">{currentLabel}</span>
          </span>
          <span className="text-right text-[#8A3200] dark:text-[#FFB98A]">
            Hết hạn mới (đề nghị){' '}
            <span className="font-sign text-[18px] font-bold font-tabular">{proposedLabel}</span>
          </span>
        </div>
      </div>
      {/* vertical ruler (phones) */}
      <ol className="flex flex-col sm:hidden">
        <li className="flex items-start gap-sm">
          <span className="mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] border-card bg-text shadow-card" />
          <span className="text-[14px] text-text">
            Hết hạn hiện tại{' '}
            <span className="block font-sign text-[18px] font-bold font-tabular">
              {currentLabel}
            </span>
          </span>
        </li>
        <li className="ml-[6px] flex items-center gap-sm border-l-[4px] border-brand py-sm pl-md">
          <span className="font-sign text-[20px] font-bold text-[#8A3200] dark:text-[#FFB98A]">
            +{termDays} ngày
          </span>
        </li>
        <li className="flex items-start gap-sm">
          <span className="mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] border-card bg-brand shadow-card" />
          <span className="text-[14px] text-[#8A3200] dark:text-[#FFB98A]">
            Hết hạn mới (đề nghị){' '}
            <span className="block font-sign text-[18px] font-bold font-tabular">
              {proposedLabel}
            </span>
          </span>
        </li>
      </ol>
      {soon || expired ? (
        <p
          className={`w-fit rounded-[8px] px-sm py-1 text-[14px] font-semibold ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
        >
          {soon
            ? `Còn lại trên hợp đồng hiện tại ${remainingDays} ngày`
            : 'Hợp đồng hiện tại đã hết hạn'}
        </p>
      ) : null}
    </div>
  );
}

export type ScoreCell = { label: string; value: ReactNode; alert?: boolean };

/** The vendor's compliance record as a score sheet; anything above zero is flagged red. */
export function ComplianceScorecard({ clean, cells }: { clean: boolean; cells: ScoreCell[] }) {
  return (
    <div className="flex flex-col gap-sm">
      {clean ? (
        <div
          className={`flex flex-wrap items-center gap-sm rounded-[16px] p-sm pr-md ${VERDICT_TONES.ok.wash}`}
        >
          <span
            aria-hidden="true"
            className={`flex h-14 w-14 shrink-0 rotate-[-6deg] flex-col items-center justify-center rounded-full border-[2.5px] border-current text-center font-sign text-[9.5px] font-extrabold uppercase leading-[11px] ${VERDICT_TONES.ok.ink}`}
          >
            <Icon name="check-circle" size={16} color="currentColor" />
            Hồ sơ sạch
          </span>
          <span className={`min-w-0 flex-1 text-[15px] font-semibold ${VERDICT_TONES.ok.ink}`}>
            Hồ sơ sạch, chưa có vi phạm
          </span>
          <StatusChip label="[AI] Đề xuất: Phê duyệt nhanh" tone="ok" />
        </div>
      ) : (
        <div
          className={`flex flex-wrap items-center gap-sm rounded-[16px] p-sm pl-md ${VERDICT_TONES.pending.wash}`}
        >
          <Icon
            name="alert-circle-outline"
            size={20}
            color="currentColor"
            className={VERDICT_TONES.pending.ink}
          />
          <span className={`min-w-0 flex-1 text-[15px] font-semibold ${VERDICT_TONES.pending.ink}`}>
            Có lịch sử cần rà soát trước khi quyết định
          </span>
          <StatusChip label="Cần xem xét kỹ" tone="pending" />
        </div>
      )}
      <dl className="grid grid-cols-2 gap-sm md:grid-cols-3">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className={`relative flex min-h-[92px] flex-col justify-between gap-xs overflow-hidden rounded-[16px] p-sm pl-md ring-1 ${
              cell.alert
                ? `${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink} ring-[#8F1717]/15`
                : 'bg-card text-text ring-border'
            }`}
          >
            {cell.alert ? (
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px] bg-error" />
            ) : null}
            <dt className={`text-[13px] ${cell.alert ? '' : 'text-muted'}`}>{cell.label}</dt>
            <dd className="font-sign text-[26px] font-extrabold leading-none font-tabular md:text-[32px]">
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A recorded decision as a ruled minute with the ward stamp beside it. */
export function DecisionRecord({
  status,
  reason,
  officerLine,
}: {
  status: string;
  reason: string | null | undefined;
  officerLine: string;
}) {
  const approved = status === 'APPROVED';
  const tone = approved
    ? VERDICT_TONES.ok
    : status === 'REJECTED'
      ? VERDICT_TONES.danger
      : VERDICT_TONES.neutral;
  return (
    <section
      aria-labelledby="decision-record-title"
      className="relative overflow-hidden rounded-[24px] bg-card p-md pr-[116px] shadow-card ring-1 ring-border md:p-lg md:pr-[140px]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0 31px, rgb(var(--c-border) / 0.7) 31px 32px)',
      }}
    >
      <h2 id="decision-record-title" className="text-[15px] font-semibold text-text">
        Quyết định của cán bộ
      </h2>
      <p
        className={`mt-xs font-sign text-[20px] font-extrabold uppercase [font-stretch:90%] ${tone.ink}`}
      >
        {approved ? 'Đã duyệt' : status === 'REJECTED' ? 'Từ chối' : status}
      </p>
      {reason ? <p className="mt-1 text-[16px] leading-[26px] text-text">{reason}</p> : null}
      <p className="mt-1 text-body-sm text-muted">{officerLine}</p>
      <div className="absolute right-sm top-sm">
        <PermitStamp
          icon={tone.icon}
          inkClass={tone.ink}
          strokeClass={tone.stroke}
          ringText="QUYẾT ĐỊNH PHƯỜNG ★ STREETBIZ ★"
          className="h-[96px] w-[96px] md:h-[112px] md:w-[112px]"
        />
      </div>
    </section>
  );
}

/** The decision desk card used in the right column on wide screens. */
export function DecisionDeskCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-[24px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md p-md pb-lg md:p-lg">
        <h2 className="font-sign text-[18px] font-bold leading-tight text-text">{title}</h2>
        {children}
      </div>
    </section>
  );
}
