import { Money } from '@/components/common';

export function OrderSummary({
  subtotal,
  total,
}: {
  subtotal: number;
  total: number;
}) {
  return (
    <dl className="flex flex-col gap-xs">
      <div className="flex items-center justify-between">
        <dt className="text-body-md text-muted">Tạm tính</dt>
        <dd><Money amountVnd={subtotal} /></dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-headline-sm text-text">Tổng thanh toán</dt>
        <dd><Money amountVnd={total} size="lg" /></dd>
      </div>
      <p className="text-body-sm text-muted">Nhận món trực tiếp tại điểm bán</p>
    </dl>
  );
}
