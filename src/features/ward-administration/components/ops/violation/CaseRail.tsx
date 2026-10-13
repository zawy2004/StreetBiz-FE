import { useId, useState, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';

/* ----------------------------------------------------------------------------
 * The case file beside the record: who does which step, which slot, what the
 * fine is, and whether the record is complete. Display only; nothing here sends
 * anything or changes the form.
 * ------------------------------------------------------------------------- */

type SpineProps = {
  step: 1 | 2;
  /** The signed-in account cannot sign the decision (known only in live mode). */
  noAuthority?: boolean;
  compact?: boolean;
};

const STEPS = [
  {
    title: 'Lập biên bản',
    who: 'Cán bộ tuần tra',
    text: 'Xác nhận hành vi vi phạm tại hiện trường. Biên bản ở trạng thái Chờ ra quyết định xử phạt.',
  },
  {
    title: 'Ra quyết định xử phạt',
    who: 'Chủ tịch / Phó Chủ tịch UBND Phường',
    text: 'Hoặc người được uỷ quyền bằng văn bản ký; cán bộ lập biên bản không có thẩm quyền này. Số tiền lấy từ khung do Phường cấu hình.',
  },
];

/**
 * The two steps as two marks joined by a kerb line: dashed while only the record
 * exists in draft, a painted kerb running in from ① to ② once it is recorded.
 */
export function StepSpine({ step, noAuthority, compact }: SpineProps) {
  return (
    <ol
      aria-label="Quy trình 2 bước"
      className={compact ? 'flex items-center gap-xs' : 'flex flex-col gap-0'}
    >
      {STEPS.map((s, i) => {
        const n = (i + 1) as 1 | 2;
        const done = n < step;
        const current = n === step;
        const mark = (
          <span
            aria-hidden="true"
            className={[
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sign text-[15px] font-bold transition-colors duration-200',
              done
                ? 'bg-[#0B5D33] text-white dark:bg-[#8BE3B0] dark:text-[#06140C]'
                : current
                  ? 'bg-primary text-on-primary ring-4 ring-brand/20'
                  : 'border-2 border-dashed border-muted/60 bg-card text-muted',
            ].join(' ')}
          >
            {done ? <Icon name="check" size={16} color="currentColor" /> : n}
          </span>
        );
        const state = done ? 'đã xong' : current ? 'đang làm' : 'chưa tới';

        if (compact) {
          return (
            <li key={s.title} className="flex min-w-0 items-center gap-xs">
              {i > 0 ? <Connector lit={step === 2} compact /> : null}
              {mark}
              <span
                className={`truncate text-label ${current ? 'text-text' : 'text-muted'}`}
                title={s.title}
              >
                {s.title}
                <span className="sr-only"> ({state})</span>
              </span>
            </li>
          );
        }

        return (
          <li key={s.title} className="flex gap-sm">
            <div className="flex flex-col items-center">
              {mark}
              {i === 0 ? <Connector lit={step === 2} /> : null}
            </div>
            <div className={`min-w-0 ${i === 0 ? 'pb-md' : ''}`}>
              <p className="text-[16px] font-semibold leading-snug text-text">
                {s.title}
                <span className="sr-only"> ({state})</span>
              </p>
              <p className="text-body-sm font-semibold text-muted">{s.who}</p>
              <p className="mt-0.5 text-body-sm text-muted">{s.text}</p>
              {n === 2 && noAuthority ? (
                <p className="mt-xs inline-flex items-center gap-1 rounded-full bg-[#FFF3D1] px-sm py-1 text-body-xs font-semibold text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                  <Icon name="lock-outline" size={13} color="currentColor" />
                  Bước 2 do người có thẩm quyền thực hiện
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Connector({ lit, compact }: { lit: boolean; compact?: boolean }) {
  const size = compact ? 'h-1.5 w-8 shrink-0 sm:w-14' : 'my-1 min-h-6 w-1.5 flex-1';
  if (lit) {
    // The painted kerb (ember / ivory blocks) running in along the line: `sb-kerb-in`.
    return (
      <span
        aria-hidden="true"
        className={[
          size,
          'animate-[sb-kerb-in_900ms_cubic-bezier(.2,.8,.2,1)_both] rounded-full ring-1 ring-brand/30',
          compact
            ? 'bg-[repeating-linear-gradient(90deg,rgb(var(--c-kerb))_0_8px,rgb(var(--c-kerb-paint))_8px_16px)]'
            : 'bg-[repeating-linear-gradient(180deg,rgb(var(--c-kerb))_0_8px,rgb(var(--c-kerb-paint))_8px_16px)]',
        ].join(' ')}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${size} rounded-full ${compact ? 'border-t-2' : 'border-l-2'} border-dashed border-muted/50`}
    />
  );
}

/** The slot code set as a painted plate, with its zone; or the vendor when no slot is known. */
export function SlotPlate({
  slotCode,
  place,
  size = 'lg',
}: {
  slotCode: string;
  place?: string | null;
  size?: 'lg' | 'sm';
}) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-sm gap-y-1">
      <span
        className={[
          'flex items-center rounded-[8px] bg-card font-sign font-extrabold leading-none tracking-[0.03em] text-text ring-text [font-stretch:66%]',
          size === 'lg' ? 'h-11 px-sm text-[26px] ring-[2.5px]' : 'h-8 px-xs text-[19px] ring-2',
        ].join(' ')}
      >
        <span className="sr-only">Ô </span>
        {slotCode}
      </span>
      {place ? (
        <span className="min-w-0 truncate text-body-md font-medium text-text/75">{place}</span>
      ) : null}
    </span>
  );
}

type PlacardProps = {
  title: string;
  amount: number | null;
  legalBasis: string | null;
  /** `missing`: no legal basis or rate in force; `unknown`: the ward schedule is not loaded. */
  state: 'amount' | 'missing' | 'unknown';
  caption?: string;
  /** Changes when the amount does, so the figure cross-fades in. */
  fadeKey?: string | number;
};

/**
 * The fine as a posted notice: the figure large in signage numerals on a pale
 * red wash (#8F1717 on #FDEBEA, 7.9:1), the legal basis under it, clamped to
 * three lines with "Xem đủ" when long.
 */
export function PenaltyPlacard({
  title,
  amount,
  legalBasis,
  state,
  caption,
  fadeKey,
}: PlacardProps) {
  const [open, setOpen] = useState(false);
  const long = (legalBasis?.length ?? 0) > 140;
  const basisId = useId();
  return (
    <div className="overflow-hidden rounded-[20px] bg-[#FDEBEA] text-[#8F1717] ring-1 ring-[#8F1717]/15 dark:bg-[#3A1414] dark:text-[#FF9A90] dark:ring-[#FF9A90]/20">
      <div className="flex flex-col gap-1 px-md pb-sm pt-md">
        <p className="text-body-sm font-semibold">{title}</p>
        <div key={fadeKey} className="sb-pop min-h-[44px]">
          {state === 'amount' && amount !== null ? (
            <p className="font-tabular font-sign text-[36px] font-extrabold leading-[1.05] tracking-[-0.01em] [font-stretch:86%]">
              {amount.toLocaleString('vi-VN')} đ
            </p>
          ) : state === 'missing' ? (
            <p className="flex items-start gap-1.5 text-[16px] font-semibold leading-snug">
              <Icon
                name="alert-octagon-outline"
                size={20}
                color="currentColor"
                className="mt-0.5 shrink-0"
              />
              Thiếu căn cứ pháp lý hoặc mức phạt hiệu lực
            </p>
          ) : (
            <p className="text-[16px] font-semibold leading-snug">
              Lấy từ Biểu mức phạt của phường khi ra quyết định
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 bg-card/70 px-md py-sm text-text dark:bg-card/40">
        {legalBasis ? (
          <>
            <p className="text-body-sm font-semibold text-muted">Căn cứ pháp lý áp dụng</p>
            <p id={basisId} className={`text-body-md ${open || !long ? '' : 'line-clamp-3'}`}>
              {legalBasis}
            </p>
            {long ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={basisId}
                onClick={() => setOpen((v) => !v)}
                className="-ml-1 min-h-10 w-fit rounded-sm px-1 text-label text-primary hover:underline"
              >
                {open ? 'Thu gọn' : 'Xem đủ'}
              </button>
            ) : null}
          </>
        ) : null}
        {caption ? <p className="text-body-sm text-muted">{caption}</p> : null}
      </div>
    </div>
  );
}

export type ChecklistItem = {
  label: string;
  /** done ✓ · todo ○ · busy (uploading) · fail ✗ · optional (not required) */
  state: 'done' | 'todo' | 'busy' | 'fail' | 'optional';
  note?: string;
};

const CHECK: Record<ChecklistItem['state'], { icon: IconName; className: string; word: string }> = {
  done: {
    icon: 'check-circle',
    className: 'text-[#0B5D33] dark:text-[#8BE3B0]',
    word: 'đã có',
  },
  todo: { icon: 'circle-outline', className: 'text-muted', word: 'chưa có' },
  busy: { icon: 'cloud-check-outline', className: 'text-primary', word: 'đang tải lên' },
  fail: {
    icon: 'close-circle-outline',
    className: 'text-[#8F1717] dark:text-[#FF9A90]',
    word: 'lỗi',
  },
  optional: { icon: 'circle-outline', className: 'text-muted/70', word: 'không bắt buộc' },
};

/** "Is the record complete?": information only, it never blocks the submit button. */
export function RecordChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="flex flex-col gap-xs">
      {items.map((item) => {
        const c = CHECK[item.state];
        return (
          <li key={item.label} className="flex items-start gap-xs">
            <span className={`mt-0.5 shrink-0 transition-colors duration-200 ${c.className}`}>
              <Icon
                name={c.icon}
                size={20}
                color="currentColor"
                weight={item.state === 'done' ? 'fill' : 'regular'}
                className={item.state === 'busy' ? 'animate-pulse' : undefined}
              />
            </span>
            <span className="min-w-0 text-body-md leading-snug text-text">
              {item.label}
              <span className="sr-only">: {c.word}</span>
              {item.note ? (
                <span className="block text-body-sm text-muted">{item.note}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A 180° dial: sanctioned violations against the ward's revocation threshold. */
export function ThresholdGauge({ count, threshold }: { count: number; threshold: number }) {
  const ratio = threshold > 0 ? Math.min(count / threshold, 1) : 0;
  const reached = threshold > 0 && count >= threshold;
  const r = 52;
  const len = Math.PI * r;
  return (
    <div className="flex items-center gap-md">
      <svg aria-hidden="true" viewBox="0 0 128 72" className="h-[72px] w-[128px] shrink-0">
        <path
          d="M12 64 A52 52 0 0 1 116 64"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="stroke-sunken"
        />
        <path
          d="M12 64 A52 52 0 0 1 116 64"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${len * ratio} ${len}`}
          className={reached ? 'stroke-[#B42318] dark:stroke-[#FF9A90]' : 'stroke-brand'}
        />
        <text
          x="64"
          y="62"
          textAnchor="middle"
          className="fill-text font-sign text-[22px] font-extrabold"
        >
          {count}/{threshold}
        </text>
      </svg>
      <p className="text-body-sm text-muted">
        <span className="font-semibold text-text">
          {count}/{threshold} lần
        </span>{' '}
        vi phạm đã có quyết định xử phạt, so với ngưỡng đề xuất thu hồi của phường.
      </p>
    </div>
  );
}

/** One labelled fact on the rail. */
export function CaseFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-body-sm font-semibold text-muted">{label}</p>
      <div className="text-[16px] font-semibold leading-snug text-text">{children}</div>
    </div>
  );
}

/** ≥1280: the case file stays in view beside the sheet. */
export function CaseRail({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-label="Hồ sơ vụ việc"
      className="hidden min-w-0 flex-col gap-md rounded-[28px] bg-card p-md shadow-card ring-1 ring-border xl:sticky xl:top-0 xl:flex"
    >
      <p className="font-sign text-[20px] font-extrabold leading-tight text-text [font-stretch:90%]">
        Hồ sơ vụ việc
      </p>
      {children}
    </aside>
  );
}

/**
 * <1280: the two steps in one line over the sheet, and the case file folded into
 * a summary strip (slot, fine, checklist count) that opens in place.
 */
export function CaseStrip({
  spine,
  summary,
  children,
}: {
  spine: ReactNode;
  summary: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <section
      aria-label="Hồ sơ vụ việc"
      className="flex min-w-0 flex-col overflow-hidden rounded-[22px] bg-card shadow-card ring-1 ring-border xl:hidden"
    >
      <div className="border-b border-border px-md py-sm">{spine}</div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-14 w-full items-center gap-sm px-md py-sm text-left hover:bg-sunken/50"
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-md gap-y-xs">
          {summary}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-label text-primary">
          <span className="hidden sm:inline">{open ? 'Thu gọn' : 'Xem hồ sơ'}</span>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="currentColor" />
        </span>
      </button>
      <div
        id={bodyId}
        className={`${open ? 'grid' : 'hidden'} gap-md border-t border-border p-md md:grid-cols-2`}
      >
        {children}
      </div>
    </section>
  );
}
