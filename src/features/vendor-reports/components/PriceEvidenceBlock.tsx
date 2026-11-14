import { formatVnd, Icon } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import type { VendorReportPriceEvidence } from '@/core/api/ai-api';
import { formatBoardStamp, priceWithUnit } from '@/features/price-board/price-board-format';

/**
 * An overcharge's price evidence (BUY-07), computed by the server from the price history at
 * the purchase time: the board version the posted price came from, posted price × quantity,
 * what was charged and the difference. Shown to the ward officer and to the reporter alike.
 */
export function PriceEvidenceBlock({ evidence }: { evidence: VendorReportPriceEvidence }) {
  const danger = VERDICT_TONES.danger;
  const versionAt = formatBoardStamp(evidence.priceVersionAt);
  const purchasedAt = formatBoardStamp(evidence.purchasedAt);
  return (
    <section
      aria-label="Bằng chứng giá"
      className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-sm gap-y-1">
        <h2 className="flex items-center gap-xs font-heading text-[18px] font-bold text-text">
          <Icon
            name="receipt-text-outline"
            size={20}
            color="currentColor"
            className="text-primary"
          />
          Bằng chứng giá
        </h2>
        <span className="text-body-sm text-muted">Máy chủ tính từ lịch sử bảng giá</span>
      </div>
      <p className="text-body-md text-text">
        <span className="font-semibold">{evidence.itemName}</span> ·{' '}
        {priceWithUnit(evidence.postedUnitPrice, evidence.priceUnit)} theo bảng giá bản số{' '}
        {evidence.priceVersion}
        {versionAt ? ` (từ ${versionAt})` : ''}
      </p>
      <dl className="grid gap-px overflow-hidden rounded-[14px] bg-border ring-1 ring-border sm:grid-cols-3">
        <div className="flex flex-col gap-0.5 bg-card p-sm">
          <dt className="text-body-xs text-muted">Giá niêm yết × số lượng</dt>
          <dd className="text-[15px] font-semibold text-text font-tabular">
            {formatVnd(evidence.postedUnitPrice)} × {evidence.quantity} {evidence.priceUnit}
            <span className="block font-sign text-[19px] font-bold [font-stretch:94%]">
              = {formatVnd(evidence.postedAmount)}
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 bg-card p-sm">
          <dt className="text-body-xs text-muted">Số tiền bị tính</dt>
          <dd className="font-sign text-[19px] font-bold text-text font-tabular [font-stretch:94%]">
            {formatVnd(evidence.chargedAmount)}
          </dd>
        </div>
        <div className={`flex flex-col gap-0.5 p-sm ${danger.wash}`}>
          <dt className={`text-body-xs ${danger.ink}`}>Chênh lệch</dt>
          <dd
            className={`font-sign text-[21px] font-extrabold font-tabular [font-stretch:92%] ${danger.ink}`}
          >
            +{formatVnd(evidence.difference)}
          </dd>
        </div>
      </dl>
      {purchasedAt ? (
        <p className="flex items-center gap-1.5 text-body-sm text-muted">
          <Icon name="clock-outline" size={15} color="currentColor" />
          Mua lúc {purchasedAt}
        </p>
      ) : null}
    </section>
  );
}
