import { useState } from 'react';

import { Icon } from '@/components/common';
import { EmptyState, Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import type { StatusTone } from '@/theme';
import type { CaseKind } from '../../ward-api';
import { CASE_KIND_NOTES } from './helpers';
import { CountUp, SlotPlate } from './Primitives';

/** Three sidewalk stories, drawn: a new dashed slot + pin, two slots overlapping, a slot changing hands. */
export function CaseKindPictogram({
  kind,
  className = 'h-14 w-14',
}: {
  kind: CaseKind;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 56 56" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect x="0" y="50" width="56" height="4" rx="1" className="fill-brand" />
      {kind === 'proposals' ? (
        <>
          <rect
            x="6"
            y="22"
            width="34"
            height="24"
            rx="4"
            className="fill-[rgb(var(--c-brand)/0.12)] stroke-brand"
            strokeWidth="2.5"
            strokeDasharray="5 4"
          />
          <path
            d="M40 4c-5 0-9 3.8-9 8.6C31 19 40 27 40 27s9-8 9-14.4C49 7.8 45 4 40 4z"
            className="fill-primary"
          />
          <circle cx="40" cy="12.5" r="3.4" className="fill-card" />
        </>
      ) : kind === 'conflicts' ? (
        <>
          <rect
            x="5"
            y="14"
            width="30"
            height="24"
            rx="4"
            className="fill-card stroke-text"
            strokeWidth="2.2"
          />
          <rect
            x="20"
            y="22"
            width="30"
            height="24"
            rx="4"
            className="fill-none stroke-brand"
            strokeWidth="2.2"
            strokeDasharray="5 4"
          />
          <rect x="20" y="22" width="15" height="16" className="fill-[rgb(var(--c-error)/0.22)]" />
        </>
      ) : (
        <>
          <rect
            x="17"
            y="26"
            width="22"
            height="20"
            rx="4"
            className="fill-[rgb(var(--c-brand)/0.18)] stroke-text"
            strokeWidth="2.2"
          />
          <circle cx="7" cy="14" r="4" className="fill-text" />
          <path d="M1 30c0-5 2.7-8 6-8s6 3 6 8" className="fill-text" />
          <circle cx="49" cy="14" r="4" className="fill-primary" />
          <path d="M43 30c0-5 2.7-8 6-8s6 3 6 8" className="fill-primary" />
          <path
            d="M19 13h18m-4-4 4 4-4 4M37 19H19m4 4-4-4 4-4"
            className="fill-none stroke-text"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

/**
 * The three kinds as lane signs. The kerb bar under the chosen sign is one
 * element that slides across when the kind changes.
 */
export function CaseKindPlates({
  kinds,
  labels,
  active,
  onSelect,
}: {
  kinds: CaseKind[];
  labels: Record<CaseKind, string>;
  active: CaseKind;
  onSelect: (kind: CaseKind) => void;
}) {
  const index = Math.max(0, kinds.indexOf(active));
  return (
    <div className="relative grid grid-cols-3 gap-xs pb-[10px] [--plate-gap:8px] md:gap-sm md:[--plate-gap:12px]">
      {kinds.map((kind) => {
        const on = kind === active;
        const noteId = `case-kind-note-${kind}`;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={on}
            aria-describedby={noteId}
            title={CASE_KIND_NOTES[kind]}
            onClick={() => onSelect(kind)}
            className={`group flex min-h-16 min-w-0 flex-col items-start gap-xs rounded-[16px] p-xs text-left ring-inset transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 sm:p-sm md:min-h-[120px] md:flex-row md:items-center md:gap-sm md:p-md ${
              on
                ? 'bg-[#FFF3E8] shadow-card ring-2 ring-primary dark:bg-[#3A2414]'
                : 'bg-card shadow-card ring-1 ring-border hover:ring-text/25'
            }`}
          >
            <CaseKindPictogram
              kind={kind}
              className="h-9 w-9 transition-transform group-hover:-translate-y-0.5 md:h-11 md:w-11 xl:h-14 xl:w-14"
            />
            <span className="min-w-0">
              <span
                className={`block font-sign text-[14px] font-bold leading-tight sm:text-[16px] md:text-[18px] xl:text-[20px] ${on ? 'text-[#8A3200] dark:text-[#FFB98A]' : 'text-text'}`}
              >
                {labels[kind]}
              </span>
              <span
                id={noteId}
                className="mt-1 hidden text-[14px] leading-[22px] text-muted lg:line-clamp-2 xl:line-clamp-3"
              >
                {CASE_KIND_NOTES[kind]}
              </span>
            </span>
          </button>
        );
      })}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 rounded-full transition-transform duration-[260ms] [transition-timing-function:var(--ease-out)]"
        style={{
          width: 'calc((100% - 2 * var(--plate-gap)) / 3)',
          transform: `translateX(calc(${index} * (100% + var(--plate-gap))))`,
          background:
            'repeating-linear-gradient(90deg, rgb(var(--c-kerb)) 0 22px, rgb(var(--c-kerb-paint)) 22px 44px)',
          height: 5,
        }}
      />
    </div>
  );
}

export type CaseSlipData = {
  code: string;
  isCode: boolean;
  applicant: string;
  fastTrack: boolean;
  summary: string;
  statusText: string;
  tone: StatusTone;
  wait: string | null;
  queuePosition: number | null;
  awaiting: boolean;
  blockerCount: number;
  location?: 'set' | 'missing';
};

/** One case on the list: slot plate first, then who and what, then status and wait. */
export function CaseSlipBody({ data }: { data: CaseSlipData }) {
  return (
    <div className="group flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-primary/40 sm:flex-row sm:items-start">
      <div className="flex items-center justify-between gap-sm sm:block">
        {data.isCode ? (
          <SlotPlate code={data.code} />
        ) : (
          <span className="text-[16px] font-semibold text-text">{data.code}</span>
        )}
        <span className="sm:hidden">
          <StatusChip label={data.statusText} tone={data.tone} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-xs">
          <span
            className="truncate text-[16px] font-semibold leading-6 text-text"
            title={data.applicant}
          >
            {data.applicant}
          </span>
          {data.fastTrack ? <StatusChip label="Ưu tiên" tone="ok" /> : null}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[14px] leading-[22px] text-muted">{data.summary}</p>
        <p className="mt-xs flex flex-wrap items-center gap-x-sm gap-y-1 text-[13px] text-muted">
          {data.awaiting ? (
            <span className="flex items-center gap-1.5 font-semibold text-text">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
              Chờ bạn quyết định
            </span>
          ) : null}
          {data.blockerCount > 0 ? (
            <span className="flex items-center gap-1 font-medium text-[#8F1717] dark:text-[#FF9A90]">
              <Icon name="block-helper" size={13} color="currentColor" />
              {data.blockerCount} điều kiện cần xử lý
            </span>
          ) : null}
          {data.location ? (
            <span className="flex items-center gap-1">
              <Icon
                name={data.location === 'set' ? 'map-marker' : 'map-marker-off-outline'}
                size={14}
                color="currentColor"
                className={data.location === 'set' ? 'text-primary' : ''}
              />
              {data.location === 'set' ? 'Đã có tọa độ' : 'Chưa có tọa độ'}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-sm gap-y-1 sm:flex-col sm:items-end">
        <span className="hidden sm:block">
          <StatusChip label={data.statusText} tone={data.tone} />
        </span>
        {data.queuePosition != null ? (
          <span className="rounded-full border-[1.5px] border-dashed border-text/40 px-2 py-0.5 text-[13px] font-semibold text-text">
            Hàng chờ #{data.queuePosition}
          </span>
        ) : null}
        {data.wait ? <span className="text-[13px] text-muted">{data.wait}</span> : null}
        <Icon
          name="chevron-right"
          size={18}
          color="currentColor"
          className="ml-auto text-muted opacity-60 transition-opacity group-hover:opacity-100 sm:ml-0"
        />
      </div>
    </div>
  );
}

export function CaseListSkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex min-h-[96px] gap-sm rounded-[20px] bg-card p-md ring-1 ring-border"
        >
          <Skeleton className="h-9 w-24 rounded-[8px]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-6 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function CaseListEmpty({ kind }: { kind: CaseKind }) {
  const icon =
    kind === 'proposals'
      ? 'map-marker-outline'
      : kind === 'conflicts'
        ? 'layers-outline'
        : 'swap-horizontal';
  return (
    <div className="rounded-[20px] bg-card shadow-card ring-1 ring-border">
      <EmptyState
        icon={icon}
        title="Chưa có hồ sơ cho nhóm này trong phường của bạn."
        description={CASE_KIND_NOTES[kind]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ W04 */

/** The case's head plate: kind pictogram, big slot plate, status, who and what. */
export function CaseHeaderPlate({
  kind,
  slotCode,
  statusText,
  tone,
  fastTrack,
  applicant,
  summary,
}: {
  kind: CaseKind;
  slotCode: string;
  statusText: string;
  tone: StatusTone;
  fastTrack: boolean;
  applicant: string;
  summary: string;
}) {
  return (
    <section
      aria-label="Thông tin chính của hồ sơ"
      className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-sm p-md md:p-lg">
        <div className="flex flex-wrap items-center gap-sm">
          <CaseKindPictogram kind={kind} className="h-12 w-12" />
          {slotCode ? <SlotPlate code={slotCode} size="lg" /> : null}
          <StatusChip label={statusText} tone={tone} />
          {fastTrack ? <StatusChip label="Ưu tiên xử lý nhanh" tone="ok" /> : null}
        </div>
        <p className="text-[20px] font-semibold leading-7 text-text">{applicant}</p>
        {summary ? <p className="text-[16px] leading-[26px] text-text/80">{summary}</p> : null}
      </div>
    </section>
  );
}

/** Conditions the server says still block the case, set like prohibition signs. */
export function CaseBlockers({ blockers }: { blockers: string[] }) {
  const t = VERDICT_TONES.danger;
  return (
    <section
      aria-labelledby="case-blockers-title"
      className={`rounded-[20px] p-md md:p-lg ${t.wash}`}
    >
      <h2
        id="case-blockers-title"
        className={`flex items-center gap-xs font-sign text-[18px] font-bold ${t.ink}`}
      >
        <Icon name="block-helper" size={20} color="currentColor" />
        Điều kiện cần xử lý ({blockers.length})
      </h2>
      <ul className="mt-sm flex flex-col gap-xs">
        {blockers.map((message) => (
          <li key={message} className={`flex items-start gap-xs text-[16px] leading-6 ${t.ink}`}>
            <span
              aria-hidden="true"
              className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-current"
            />
            <span>{message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ W09 */

/** What the officer weighs on a transfer: what is still owed, and the term that carries over. */
export function TransferLedgerPlate({
  outstanding,
  contractTerm,
}: {
  outstanding: number | null;
  contractTerm: string | null;
}) {
  if (outstanding == null && !contractTerm) return null;
  const owes = outstanding != null && outstanding > 0;
  const t = owes ? VERDICT_TONES.danger : VERDICT_TONES.ok;
  return (
    <section
      aria-label="Công nợ và thời hạn giữ nguyên"
      className="grid overflow-hidden rounded-[24px] shadow-card ring-1 ring-border md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      {outstanding != null ? (
        <dl className={`flex flex-col gap-xs p-md md:p-lg ${t.wash} ${t.ink}`}>
          <dt className="flex items-center gap-xs text-[14px] font-semibold">
            <Icon
              name={owes ? 'alert-octagon-outline' : 'check-circle'}
              size={18}
              color="currentColor"
            />
            Phí và phạt chưa thanh toán
          </dt>
          <dd className="flex items-center gap-sm">
            <span className="font-sign text-[36px] font-extrabold leading-none tracking-[-0.01em] [font-stretch:88%] font-tabular md:text-[44px]">
              <CountUp
                value={outstanding}
                format={(n) => `${n.toLocaleString('vi-VN')} ₫`}
                duration={500}
              />
            </span>
            {!owes ? (
              <span
                aria-hidden="true"
                className="sb-stamp flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-current"
              >
                <Icon name="check" size={22} color="currentColor" />
              </span>
            ) : null}
          </dd>
          {!owes ? (
            <dd className="text-[14px] font-medium">Không còn phí và phạt chưa thanh toán</dd>
          ) : null}
        </dl>
      ) : null}
      {contractTerm ? (
        <dl
          className={`relative flex flex-col gap-xs bg-[#FFF3E8] p-md pb-lg dark:bg-[#2A2420] md:p-lg ${outstanding == null ? 'md:col-span-2' : ''}`}
        >
          <dt className="flex items-center gap-xs text-[14px] font-semibold text-[#8A3200] dark:text-[#FFB98A]">
            <Icon name="clock-outline" size={18} color="currentColor" />
            Thời hạn giữ nguyên
          </dt>
          <dd className="font-sign text-[20px] font-bold leading-tight text-text font-tabular">
            {contractTerm}
          </dd>
          <dd className="text-[13px] text-muted">Thời hạn hợp đồng giữ nguyên khi chuyển nhượng</dd>
          <span aria-hidden="true" className="sb-kerb sb-kerb-thin absolute inset-x-0 bottom-0" />
        </dl>
      ) : null}
    </section>
  );
}

const TRANSFER_STEPS = ['Gửi đề nghị', 'Bên nhận đã đồng ý', 'Phường quyết định'];

/** Three milestones of a transfer; only drawn for status codes whose meaning is settled. */
export function TransferProgress({ status }: { status: string }) {
  if (status !== 'ACCEPTED_BY_RECEIVER' && status !== 'APPROVED' && status !== 'REJECTED')
    return null;
  const state = (i: number): 'done' | 'wait' | 'rejected' =>
    i < 2 ? 'done' : status === 'APPROVED' ? 'done' : status === 'REJECTED' ? 'rejected' : 'wait';
  return (
    <ol
      aria-label="Tiến độ chuyển nhượng"
      className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border sm:flex-row sm:items-start sm:gap-0 md:p-lg"
    >
      {TRANSFER_STEPS.map((label, i) => {
        const s = state(i);
        const dot =
          s === 'done'
            ? 'bg-tertiary text-white'
            : s === 'rejected'
              ? 'bg-error text-white'
              : 'bg-brand text-white';
        return (
          <li
            key={label}
            aria-current={i === 2 ? 'step' : undefined}
            title={label}
            className="flex items-center gap-xs sm:flex-1 sm:flex-col sm:items-start"
          >
            <span className="flex w-full items-center gap-xs">
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${dot}`}
              >
                <Icon
                  name={s === 'done' ? 'check' : s === 'rejected' ? 'close' : 'clock-outline'}
                  size={13}
                  color="currentColor"
                />
              </span>
              {i < TRANSFER_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`hidden h-[2px] flex-1 rounded-full sm:block ${state(i + 1) === 'done' ? 'bg-tertiary' : state(i + 1) === 'rejected' ? 'bg-error' : 'bg-brand/50'}`}
                />
              ) : null}
            </span>
            <span className="text-[14px] font-medium text-text sm:pr-sm">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ W10 */

/** The queue number, printed on a ticket with a torn left edge. */
export function QueueTicket({
  queuePosition,
  slotCode,
  statusText,
  tone,
}: {
  queuePosition: number | null;
  slotCode: string;
  statusText: string;
  tone: StatusTone;
}) {
  const torn = {
    WebkitMaskImage: 'radial-gradient(circle 7px at 0 50%, transparent 97%, #000)',
    maskImage: 'radial-gradient(circle 7px at 0 50%, transparent 97%, #000)',
    WebkitMaskSize: '100% 22px',
    maskSize: '100% 22px',
    WebkitMaskRepeat: 'repeat-y',
    maskRepeat: 'repeat-y',
  } as const;
  const has = queuePosition != null;
  return (
    <section
      aria-label="Vị trí hàng chờ"
      style={torn}
      className={`sb-pop relative flex min-h-[180px] flex-col gap-xs overflow-hidden rounded-r-[24px] p-md pl-lg md:p-lg md:pl-xl ${
        has ? 'bg-card shadow-card' : 'border-2 border-dashed border-border bg-card'
      }`}
    >
      <span aria-hidden="true" className="sb-kerb sb-kerb-thin absolute inset-x-0 top-0" />
      <p className="pt-xs text-[14px] font-medium text-muted">Vị trí hàng chờ</p>
      {has ? (
        <p className="font-sign text-[64px] font-extrabold leading-none tracking-[-0.03em] text-text [font-stretch:86%] font-tabular md:text-[88px]">
          <span className="sr-only">Vị trí hàng chờ thứ {queuePosition}</span>
          <span aria-hidden="true">#{queuePosition}</span>
        </p>
      ) : (
        <p className="py-sm text-[18px] font-semibold text-muted">Chưa có vị trí hàng chờ</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-xs">
        {slotCode ? <SlotPlate code={slotCode} /> : null}
        <StatusChip label={statusText} tone={tone} />
      </div>
    </section>
  );
}

export const QUEUE_RULE =
  'Xếp hàng chỉ ghi nhận thứ tự chờ. Hợp đồng người đang thuê và ô cũ được giữ nguyên.';

/** Two applications, one place: the tenant's slot stays put, this case waits behind it. */
export function ConflictOverlapArt() {
  const [focus, setFocus] = useState(false);
  return (
    <section className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <svg
        viewBox="0 0 320 150"
        role="img"
        aria-label="Minh họa: ô của người đang thuê giữ nguyên, hồ sơ này đứng chờ phía sau"
        className="h-[140px] w-full"
        onMouseEnter={() => setFocus(true)}
        onMouseLeave={() => setFocus(false)}
      >
        <rect
          x="0"
          y="0"
          width="320"
          height="128"
          rx="14"
          className="fill-[#FFF3E8] dark:fill-[#2A2420]"
        />
        <rect
          x="30"
          y="26"
          width="120"
          height="78"
          rx="10"
          className="fill-card stroke-text"
          strokeWidth="2.5"
        />
        <text x="44" y="58" className="fill-text font-sign" fontSize="13" fontWeight="700">
          Người đang thuê
        </text>
        <text x="44" y="78" className="fill-muted" fontSize="11.5">
          Hợp đồng: giữ nguyên
        </text>
        <rect
          x="140"
          y="40"
          width="140"
          height="78"
          rx="10"
          className="fill-[rgb(var(--c-brand)/0.1)] stroke-brand"
          strokeWidth="2.5"
          strokeDasharray="7 5"
        />
        <text
          x="164"
          y="76"
          className="fill-[#8A3200] font-sign dark:fill-[#FFB98A]"
          fontSize="13"
          fontWeight={focus ? 800 : 700}
        >
          Hồ sơ này
        </text>
        <text x="164" y="96" className="fill-muted" fontSize="11.5">
          Ghi nhận thứ tự chờ
        </text>
        {Array.from({ length: 15 }, (_, i) => (
          <rect
            key={i}
            x={i * 22}
            y="134"
            width="22"
            height="8"
            className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
          />
        ))}
      </svg>
      <p className="text-[16px] leading-[26px] text-text">{QUEUE_RULE}</p>
    </section>
  );
}
