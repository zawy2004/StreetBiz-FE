import { useId, useState, type ReactNode } from 'react';

import { Icon, Money } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import type { CustomerComplaint } from '@/core/api';
import { LiveDot } from '../OrderShapes';

/**
 * C16 parts: a clean feedback slip addressed to the StreetBiz support desk
 * (platform administrators, never the ward), and a case file per request.
 */

/** A thin round support seal: "STREETBIZ ★ HỖ TRỢ". Not a ward stamp. */
export function SupportSeal({ className = '' }: { className?: string }) {
  const ringId = `support-seal-${useId().replace(/:/g, '')}`;
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className={`text-primary ${className}`}>
      <defs>
        <path id={ringId} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        fill="currentColor"
        fontSize="9.5"
        fontWeight="700"
        letterSpacing="1.6"
        className="font-sign"
      >
        <textPath href={`#${ringId}`}>STREETBIZ ★ HỖ TRỢ ★ STREETBIZ ★ HỖ TRỢ ★</textPath>
      </text>
      <path
        d="M41 50 l6 6 l12 -13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The slip itself: a primary rule on top, the slip's head, then the form. */
export function ComplaintSheet({
  orderCode,
  children,
}: {
  orderCode: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label="Phiếu phản ánh"
      className="cq flex flex-col gap-md rounded-[20px] border-t-4 border-primary bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <header className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="font-sign text-[13px] font-semibold uppercase tracking-[0.08em] text-primary">
            Phiếu phản ánh
          </p>
          <p className="mt-0.5 font-sign text-[22px] font-bold tabular-nums tracking-[-0.01em] text-text">
            Đơn #{orderCode}
          </p>
          <p className="mt-2xs text-body-sm text-muted">Quản trị viên StreetBiz xem xét</p>
        </div>
        <SupportSeal className="h-[72px] w-[72px] shrink-0 -rotate-6 opacity-90" />
      </header>
      {children}
    </section>
  );
}

/** "Tối đa 50.000 đ" beside the amount field, and a bar of what was typed against it. */
export function RefundAmountMeter({ amount, max }: { amount: string; max: number }) {
  const value = Number(amount);
  const known = amount.trim() !== '' && Number.isFinite(value);
  const over = known && value > max;
  const ratio = known && max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div aria-hidden="true" className="flex items-center gap-sm">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
        <div
          style={{ transform: `scaleX(${over ? 1 : ratio})` }}
          className={`h-full origin-left rounded-full transition-[transform,background-color] duration-200 ${
            over ? 'bg-accent' : 'bg-primary'
          }`}
        />
      </div>
    </div>
  );
}

/** "{n}/1000" under a long field. */
export function LengthCounter({ length, max }: { length: number; max: number }) {
  return (
    <span className="font-sign text-[13px] tabular-nums text-muted">
      {length}/{max}
    </span>
  );
}

type Step = { label: string; state: 'done' | 'here' | 'todo' | 'ok' | 'no'; time?: string };

function caseSteps(complaint: CustomerComplaint): Step[] {
  const sent = new Date(complaint.createdAt).toLocaleString('vi-VN');
  if (complaint.status === 'RESOLVED') {
    return [
      { label: 'Đã gửi', state: 'done', time: sent },
      { label: 'Đang xét', state: 'done' },
      { label: 'Kết quả', state: 'ok' },
    ];
  }
  if (complaint.status === 'REJECTED') {
    return [
      { label: 'Đã gửi', state: 'done', time: sent },
      { label: 'Đang xét', state: 'done' },
      { label: 'Kết quả', state: 'no' },
    ];
  }
  if (complaint.status === 'UNDER_REVIEW') {
    return [
      { label: 'Đã gửi', state: 'done', time: sent },
      { label: 'Đang xét', state: 'here' },
      { label: 'Kết quả', state: 'todo' },
    ];
  }
  return [
    { label: 'Đã gửi', state: 'here', time: sent },
    { label: 'Đang xét', state: 'todo' },
    { label: 'Kết quả', state: 'todo' },
  ];
}

const DOT: Record<Step['state'], string> = {
  done: 'bg-primary',
  here: 'bg-card ring-[3px] ring-primary',
  todo: 'bg-card ring-2 ring-border',
  ok: 'bg-[#0B7F43]',
  no: 'bg-[#B42318]',
};

/** One request in the case file: what was asked, where it stands, and the reply. */
export function ComplaintCase({ complaint }: { complaint: CustomerComplaint }) {
  const [expanded, setExpanded] = useState(false);
  const long = complaint.description.length > 220;
  const steps = caseSteps(complaint);
  return (
    <article className="sb-rise flex flex-col gap-sm rounded-[18px] bg-card p-md shadow-card ring-1 ring-border/80">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <h2 className="text-headline-sm text-text">
          {complaint.complaintType === 'REFUND_REQUEST' ? 'Yêu cầu hoàn tiền' : 'Khiếu nại'}
        </h2>
        <StatusChip code={complaint.status} />
      </div>
      <ol className="flex items-start">
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={step.state === 'here' ? 'step' : undefined}
            className={`flex min-w-0 flex-col ${index < steps.length - 1 ? 'flex-1' : 'flex-none'}`}
          >
            <div className="flex items-center">
              <span
                key={step.state}
                className={`h-4 w-4 shrink-0 rounded-full ${DOT[step.state]} ${
                  step.state === 'ok' || step.state === 'no' ? 'sb-pop' : ''
                }`}
              />
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`mx-1 h-[3px] flex-1 rounded-full ${
                    step.state === 'done' ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ) : null}
            </div>
            <span
              className={`mt-1 text-body-xs font-semibold ${
                step.state === 'ok'
                  ? 'text-[#0B5D33] dark:text-[#8BE3B0]'
                  : step.state === 'no'
                    ? 'text-[#8F1717] dark:text-[#FF9A90]'
                    : step.state === 'todo'
                      ? 'text-muted'
                      : 'text-text'
              }`}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
      <div>
        <p
          className={`whitespace-pre-line break-words text-body-md text-text ${
            long && !expanded ? 'line-clamp-4' : ''
          }`}
        >
          {complaint.description}
        </p>
        {long ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="mt-2xs min-h-11 text-label text-primary hover:underline"
          >
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        ) : null}
      </div>
      {complaint.requestedRefundAmount !== null ? (
        <Money amountVnd={complaint.requestedRefundAmount} />
      ) : null}
      {complaint.resolutionNotes ? (
        <div className="relative ml-xs mt-xs rounded-[14px] rounded-tl-[4px] bg-sunken px-sm py-xs">
          <span
            aria-hidden="true"
            className="absolute -left-1.5 top-0 h-3 w-3 bg-sunken [clip-path:polygon(100%_0,0_0,100%_100%)]"
          />
          <p className="whitespace-pre-line break-words text-body-md text-text">
            Phản hồi: {complaint.resolutionNotes}
          </p>
        </div>
      ) : null}
      <p className="text-body-sm text-muted">
        {new Date(complaint.createdAt).toLocaleString('vi-VN')}
      </p>
    </article>
  );
}

/** The case file: every request sent for this order, newest as the server lists it. */
export function ComplaintCaseFile({ children, empty }: { children: ReactNode; empty: boolean }) {
  return (
    <section aria-label="Hồ sơ xử lý" className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <p className="font-sign text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
          Hồ sơ xử lý
        </p>
        <LiveDot>Trang tự cập nhật kết quả.</LiveDot>
      </div>
      {empty ? (
        <div className="flex flex-col items-center gap-sm rounded-[18px] border-2 border-dashed border-border px-md py-lg text-center">
          <Icon
            name="clipboard-text-outline"
            size={36}
            color="rgb(var(--c-muted))"
            weight="duotone"
          />
          <p className="text-body-md text-muted">Chưa có yêu cầu nào cho đơn này.</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** Loading: the order line, three fields of the slip, one case. */
export function ComplaintSkeleton() {
  return (
    <div aria-label="Đang tải khiếu nại" className="flex flex-col gap-lg">
      <Skeleton className="h-16 w-full rounded-[18px]" />
      <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-md rounded-[20px] bg-card p-lg ring-1 ring-border">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-11 w-2/3" />
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-[18px]" />
      </div>
    </div>
  );
}
