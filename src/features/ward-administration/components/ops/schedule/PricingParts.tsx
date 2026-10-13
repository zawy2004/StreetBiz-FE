import { useEffect, useState, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import type { ZoneImpactPreview } from '../../../ward-config-api';
import { vndInline } from './schedule-format';
import { useArrived, useCountUp } from './schedule-motion';

/**
 * The page's at-a-glance line: how many zones, how many slots (and how many are
 * let), and how many zones still lack a permitting document.
 */
export function PricingSummaryLine({
  zoneCount,
  slotCount,
  activeSlots,
  missingDocs,
}: {
  zoneCount: number;
  slotCount: number;
  activeSlots: number;
  missingDocs: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-lg gap-y-sm">
      <p className="flex items-baseline gap-1.5 text-body-md text-muted">
        <span className="font-sign text-[26px] font-extrabold leading-none text-text font-tabular">
          {zoneCount}
        </span>
        khu vực
      </p>
      <p className="flex items-baseline gap-1.5 text-body-md text-muted">
        <span className="font-sign text-[26px] font-extrabold leading-none text-text font-tabular">
          {slotCount}
        </span>
        ô<span className="text-body-sm">({activeSlots} đang cho thuê)</span>
      </p>
      {missingDocs > 0 ? (
        <p className="flex min-h-9 items-center gap-1.5 rounded-[8px] bg-[#FDEBEA] px-sm text-body-md font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
          <Icon name="alert-circle-outline" size={18} color="currentColor" />
          {missingDocs} khu vực chưa có văn bản cho phép
        </p>
      ) : zoneCount > 0 ? (
        <p className="flex min-h-9 items-center gap-1.5 rounded-[8px] bg-[#E6F6EC] px-sm text-body-md font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
          <Icon name="check-circle-outline" size={18} color="currentColor" />
          Mọi khu vực đã có văn bản cho phép
        </p>
      ) : null}
    </div>
  );
}

/** The baseline introduction, one line by default with a toggle to read it all. */
export function IntroNote({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start gap-sm rounded-[16px] bg-[#FFF3E8] px-md py-xs dark:bg-[#2A2420]">
      <Icon
        name="information-outline"
        size={20}
        color="currentColor"
        className="mt-[13px] shrink-0 text-primary"
      />
      <p
        className={`min-w-0 flex-1 py-[11px] text-body-md text-text ${open ? '' : 'line-clamp-2 md:line-clamp-1'}`}
      >
        {children}
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-12 shrink-0 rounded-sm px-xs text-body-sm font-semibold text-primary hover:underline"
      >
        {open ? 'Thu gọn' : 'Xem thêm'}
      </button>
    </div>
  );
}

/**
 * With one zone the column would sit half empty, so the introduction becomes a
 * guide card: two signs on one street, priced differently by segment.
 */
export function ZoningGuide({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-md rounded-[20px] border-2 border-dashed border-brand/40 bg-[#FFF3E8]/60 p-md dark:bg-[#2A2420]/60">
      <svg aria-hidden="true" viewBox="0 0 280 72" className="h-[72px] w-full max-w-[280px]">
        <rect
          x="0"
          y="40"
          width="280"
          height="22"
          rx="4"
          className="fill-[#E9EDF1] dark:fill-[#1D2833]"
        />
        <path
          d="M8 51 H272"
          strokeDasharray="14 10"
          strokeWidth="2.5"
          className="stroke-white/90 dark:stroke-white/25"
        />
        {Array.from({ length: 14 }, (_, i) => (
          <rect
            key={i}
            x={i * 20}
            y="62"
            width="20"
            height="6"
            className={i % 2 ? 'fill-[#FFF8F2] dark:fill-[#3A332D]' : 'fill-brand'}
          />
        ))}
        <path d="M140 4 V66" strokeWidth="2" strokeDasharray="4 4" className="stroke-primary" />
        <rect x="26" y="6" width="84" height="28" rx="6" className="fill-card stroke-border" />
        <rect x="34" y="12" width="26" height="7" rx="2" className="fill-[#13202E]" />
        <rect x="34" y="23" width="56" height="6" rx="3" className="fill-brand" />
        <rect x="170" y="6" width="84" height="28" rx="6" className="fill-card stroke-border" />
        <rect x="178" y="12" width="26" height="7" rx="2" className="fill-[#13202E]" />
        <rect x="178" y="23" width="34" height="6" rx="3" className="fill-accent" />
      </svg>
      <div className="flex flex-col gap-xs">
        <p className="font-sign text-[17px] font-bold leading-snug text-text">
          Chia khu vực theo đoạn đường để định giá khác nhau
        </p>
        <p className="text-body-md text-text/85">{children}</p>
      </div>
    </div>
  );
}

/** Right column on wide screens before any zone is chosen. */
export function SelectPrompt() {
  return (
    <div className="hidden min-h-[320px] flex-col items-center justify-center gap-sm rounded-[28px] border-2 border-dashed border-border px-lg text-center xl:flex">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-primary text-primary">
        <Icon name="pencil-outline" size={26} color="currentColor" weight="duotone" />
      </span>
      <p className="font-sign text-[19px] font-bold text-text">Chọn một khu vực để sửa</p>
      <p className="max-w-[40ch] text-body-md text-muted">
        Bấm vào một biển giá bên trái để đổi giá, khung giờ, văn bản hoặc phụ phí.
      </p>
    </div>
  );
}

/** A titled group of fields inside the zone editor. */
export function EditorGroup({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: IconName;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-md border-t border-border pt-lg first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-xs font-sign text-[15px] font-bold leading-tight text-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-tint-primary text-primary">
            <Icon name={icon} size={17} color="currentColor" />
          </span>
          {title}
        </h3>
        {description ? <div className="text-body-sm text-muted">{description}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** The save bar: pinned to the bottom of the scroll area while the editor is on screen. */
export function SaveDock({ hint, children }: { hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-md flex flex-col gap-xs border-y border-border bg-card/95 px-md py-sm backdrop-blur md:-mx-lg md:px-lg md:py-md">
      {hint}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-end [&>button]:min-h-[52px] sm:[&>button]:min-w-[220px]">
        {children}
      </div>
    </div>
  );
}

/** One-time notice after a 409: the editor now shows the other officer's version. */
export function ConflictBand() {
  return (
    <p className="sb-pop flex items-start gap-xs rounded-[12px] bg-[#FFF3D1] px-sm py-sm text-body-md font-medium text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
      <Icon name="alert-circle-outline" size={20} color="currentColor" className="mt-px shrink-0" />
      Khu vực vừa được cập nhật bởi cán bộ khác, hãy kiểm tra lại.
    </p>
  );
}

function ReceiptTotal({ delta }: { delta: number }) {
  const shown = useCountUp(Math.abs(delta));
  const sign = delta >= 0 ? '+' : '-';
  const tone =
    delta > 0
      ? 'text-[#8F1717] dark:text-[#FF9A90]'
      : delta < 0
        ? 'text-[#0B5D33] dark:text-[#8BE3B0]'
        : 'text-text';
  return (
    <strong
      className={`font-sign text-[28px] font-extrabold leading-none font-tabular [font-stretch:88%] ${tone}`}
    >
      <span aria-hidden="true">
        {sign}
        {vndInline(shown)}
      </span>
      <span className="sr-only">
        {delta >= 0 ? '+' : ''}
        {vndInline(delta)}
      </span>
    </strong>
  );
}

/**
 * The impact preview as a till receipt: a torn top edge, one line per pending
 * application or renewal with dotted leaders to "before → after", the total
 * difference in large figures, and who will be notified. Every sentence of the
 * baseline panel is kept. It prints downwards out of the button above it.
 */
export function ImpactReceipt({ preview }: { preview: ZoneImpactPreview }) {
  const rows = [...preview.pendingApplications, ...preview.openRenewals];
  const printed = useArrived();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!printed) return;
    const t = setTimeout(() => setSettled(true), 420);
    return () => clearTimeout(t);
  }, [printed]);

  return (
    <div
      aria-live="polite"
      className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-[400ms] motion-safe:[transition-timing-function:var(--ease-out)] ${printed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
    >
      <div className={settled ? '' : 'overflow-hidden'}>
        <div
          className={`motion-safe:transition-transform motion-safe:duration-[400ms] ${printed ? 'translate-y-0' : '-translate-y-6'}`}
        >
          <div
            aria-hidden="true"
            className="h-2"
            style={{
              backgroundImage:
                'linear-gradient(-45deg, rgb(var(--c-card)) 5px, transparent 0), linear-gradient(45deg, rgb(var(--c-card)) 5px, transparent 0)',
              backgroundSize: '10px 10px',
              backgroundPosition: 'left bottom',
              backgroundRepeat: 'repeat-x',
            }}
          />
          <div className="flex flex-col gap-sm rounded-b-[14px] bg-card px-md pb-md pt-xs shadow-card">
            <p className="flex items-center gap-xs font-sign text-[15px] font-bold text-text">
              <Icon
                name="receipt-text-outline"
                size={18}
                color="currentColor"
                className="text-primary"
              />
              Tác động nếu lưu
            </p>
            {!preview.amountChanged && !preview.hoursChanged && (
              <p className="text-body-md text-text">Số tiền phải nộp và khung giờ không đổi.</p>
            )}
            {preview.amountChanged && (
              <>
                <p className="text-body-md text-text">
                  {preview.pendingApplications.length} đơn thuê và {preview.openRenewals.length} đơn
                  gia hạn đang chờ sẽ được tính lại tổng tiền (giá thuê + phụ phí cố định) khi
                  duyệt. Hợp đồng và biểu phí đã phát hành không thay đổi.
                </p>
                {rows.length > 0 && (
                  <ul className="flex flex-col gap-xs border-y border-dashed border-border py-sm">
                    {rows.map((r) => (
                      <li
                        key={`${r.kind}-${r.id}`}
                        className="flex flex-wrap items-baseline gap-x-xs text-body-sm text-text"
                      >
                        <span className="min-w-0">
                          {r.kind === 'RENEWAL' ? 'Gia hạn' : 'Đơn thuê'} ô{' '}
                          <span className="font-sign font-bold">{r.slotCode}</span> · {r.vendorName}{' '}
                          · {r.termDays} ngày
                        </span>
                        <span
                          aria-hidden="true"
                          className="hidden min-w-md flex-1 translate-y-[-3px] border-b-2 border-dotted border-border sm:block"
                        />
                        <span className="ml-auto whitespace-nowrap font-tabular">
                          {vndInline(r.currentTotal)} →{' '}
                          <span className="font-semibold">{vndInline(r.newTotal)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-baseline justify-between gap-xs">
                  <span className="text-body-md font-semibold text-text">Tổng chênh lệch:</span>
                  <ReceiptTotal delta={preview.totalDelta} />
                </div>
              </>
            )}
            {preview.hoursChanged && (
              <p className="flex items-start gap-xs text-body-md text-text">
                <Icon
                  name="clock-outline"
                  size={18}
                  color="currentColor"
                  className="mt-0.5 shrink-0 text-muted"
                />
                <span>
                  {preview.activeContractsAffectedByHours} hộ đang thuê sẽ phải theo khung giờ mới.
                </span>
              </p>
            )}
            {preview.vendorsToNotify > 0 && (
              <p className="flex items-start gap-xs border-t border-dashed border-border pt-sm text-body-md text-text">
                <Icon
                  name="bell-outline"
                  size={18}
                  color="currentColor"
                  className="mt-0.5 shrink-0 text-primary"
                />
                <span>
                  Hệ thống sẽ gửi thông báo cho {preview.vendorsToNotify} hộ kinh doanh liên quan.
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
