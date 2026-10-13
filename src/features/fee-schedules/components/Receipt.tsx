import { useEffect, useState, type ReactNode } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { EASE_OUT, PAPER_SHADOW, TEETH_BOTH_MASK, useEntered } from './finance-styles';
import { INVOICE_PROMISE } from './Ledger';

/**
 * "Biên lai vừa xé khỏi cuống": a narrow white paper with teeth at both ends,
 * eased down as if it had just come out of the printer. Not a legal document:
 * no form number, tax code, signature, QR or barcode is drawn on it.
 */
export function ReceiptPaper({
  labelledBy,
  children,
}: {
  labelledBy?: string;
  children: ReactNode;
}) {
  const entered = useEntered();
  return (
    <div
      className="mx-auto w-full max-w-[480px] transition-[transform,clip-path] duration-[520ms]"
      style={{
        ...PAPER_SHADOW,
        ...EASE_OUT,
        transform: entered ? 'translateY(0)' : 'translateY(-12px)',
        clipPath: entered ? 'inset(-40px -40px -40px -40px)' : 'inset(0 0 100% 0)',
      }}
    >
      <article
        aria-labelledby={labelledBy}
        className="relative bg-card px-md pb-xl pt-lg md:px-lg"
        style={TEETH_BOTH_MASK}
      >
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin -mx-md mb-md md:-mx-lg" />
        {children}
      </article>
    </div>
  );
}

/** A label, a dotted leader, the value: lined up like a thermal-printer receipt. */
export function ReceiptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-xs gap-y-1 py-1.5">
      <dt className="flex min-w-0 flex-1 items-baseline gap-xs text-[15px] text-muted after:min-w-6 after:flex-1 after:translate-y-[-3px] after:border-b-2 after:border-dotted after:border-border after:content-['']">
        {label}
      </dt>
      <dd className="ml-auto max-w-full text-right text-[16px] font-semibold leading-6 text-text">
        {children}
      </dd>
    </div>
  );
}

/**
 * The green "paid" stamp: only drawn when the server says when it was paid.
 * It comes down once the paper has settled (at once under reduced motion).
 */
export function PaidStamp() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setShown(true), reduce ? 0 : 480);
    return () => window.clearTimeout(timer);
  }, []);
  if (!shown) return null;
  const tone = VERDICT_TONES.ok;
  return (
    <PermitStamp
      icon="check"
      inkClass={tone.ink}
      strokeClass={tone.stroke}
      ringText="STREETBIZ ★ ĐÃ THANH TOÁN ★"
      className="absolute -right-1 -top-3 h-[104px] w-[104px] mix-blend-multiply dark:mix-blend-normal md:h-[112px] md:w-[112px]"
    />
  );
}

/** The receipt's foot: a cut line and where the invoice came from. */
export function ReceiptFoot() {
  return (
    <div className="mt-md">
      <div aria-hidden="true" className="border-t-2 border-dashed border-border" />
      <p className="mt-sm flex items-start gap-xs text-[13px] leading-5 text-muted">
        <span className="mt-0.5 shrink-0 text-tertiary">
          <Icon name="cloud-check-outline" size={16} color="currentColor" />
        </span>
        Hoá đơn được hệ thống xuất sau khi ví xác nhận thanh toán.
      </p>
    </div>
  );
}

/** "Về hoá đơn này", beside the receipt on wide screens only. */
export function InvoiceAbout() {
  return (
    <aside className="hidden flex-col gap-sm rounded-[20px] bg-card p-md ring-1 ring-border/80 xl:flex">
      <h2 className="text-[16px] font-bold leading-6 text-text">Về hoá đơn này</h2>
      <p className="text-body-md text-text">{INVOICE_PROMISE}</p>
      <p className="flex items-start gap-xs text-body-md text-muted">
        <span className="mt-0.5 shrink-0">
          <Icon name="information-outline" size={18} color="currentColor" />
        </span>
        Cần đối chiếu? Chụp màn hình tờ hoá đơn để gửi kế toán hoặc đưa Cán bộ Phường xem.
      </p>
    </aside>
  );
}

/** The paper in outline while the invoice loads: same teeth, six leader rows, no stamp. */
export function ReceiptSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[480px]" style={PAPER_SHADOW}>
      <div className="flex flex-col gap-sm bg-card px-lg pb-xl pt-lg" style={TEETH_BOTH_MASK}>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mx-auto my-sm h-12 w-3/5" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
