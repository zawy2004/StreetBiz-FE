import type { ReactNode } from 'react';

/** An empty ticket stub, dashed, waiting for its first order. */
export function EmptyStubArt({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 120" className={className}>
      <path
        d="M18 10 H202 a10 10 0 0 1 10 10 V50 a10 10 0 0 0 0 20 V100 a10 10 0 0 1 -10 10 H18 a10 10 0 0 1 -10 -10 V70 a10 10 0 0 0 0 -20 V20 a10 10 0 0 1 10 -10 Z"
        strokeWidth="2.5"
        strokeDasharray="9 7"
        className="fill-[#FFF3E8] stroke-brand/60 dark:fill-[#2A2420]"
      />
      <path d="M150 18 V102" strokeWidth="2" strokeDasharray="5 5" className="stroke-brand/45" />
      <rect x="28" y="34" width="70" height="10" rx="5" className="fill-brand/25" />
      <rect x="28" y="54" width="96" height="8" rx="4" className="fill-brand/15" />
      <rect x="28" y="72" width="54" height="8" rx="4" className="fill-brand/15" />
      <rect x="162" y="48" width="36" height="10" rx="5" className="fill-primary/35" />
      <rect x="162" y="66" width="28" height="8" rx="4" className="fill-brand/20" />
    </svg>
  );
}

export function OrderEmptyState({
  vendor = false,
  title,
  description,
  action,
}: {
  vendor?: boolean;
  /** Overrides the default wording (the demo screen words it differently). */
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sb-pop flex flex-col items-center px-md py-xl text-center">
      <EmptyStubArt className="h-[110px] w-[200px]" />
      <p className="mt-md font-heading text-[22px] font-semibold leading-tight text-text">
        {title ?? (vendor ? 'Không có đơn trong trạng thái này' : 'Bạn chưa có đơn hàng nào')}
      </p>
      {description ? (
        <p className="mt-xs max-w-[44ch] text-body-md text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-lg">{action}</div> : null}
    </div>
  );
}
