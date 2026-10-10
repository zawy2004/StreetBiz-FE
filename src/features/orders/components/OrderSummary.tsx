import { Money } from '@/components/common';

/** Subtotal and total of an order, receipt style. Exactly two amounts. */
export function OrderSummary({ subtotal, total }: { subtotal: number; total: number }) {
  return (
    <dl className="flex flex-col gap-xs">
      <div className="flex items-end gap-xs">
        <dt className="flex flex-1 items-end gap-xs text-body-md text-muted">
          Tạm tính
          <span
            aria-hidden="true"
            className="mb-1.5 flex-1 border-b-2 border-dotted border-border"
          />
        </dt>
        <dd>
          <Money amountVnd={subtotal} className="whitespace-nowrap" />
        </dd>
      </div>
      <div className="flex items-center justify-between gap-sm border-t-2 border-text/80 pt-xs">
        <dt className="text-headline-sm text-text">Tổng thanh toán</dt>
        <dd>
          <Money amountVnd={total} size="lg" className="whitespace-nowrap" />
        </dd>
      </div>
      <p className="text-body-sm text-muted">Nhận món trực tiếp tại điểm bán</p>
    </dl>
  );
}
