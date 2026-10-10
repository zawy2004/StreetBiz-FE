import { Money } from '@/components/common';
import type { OrderItem } from '../types/order.types';

/**
 * The dishes of an order as printed on a receipt: "2× Bánh mì", a dotted
 * leader to the line total, then the price per dish and the buyer's note.
 */
export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="flex flex-col gap-sm">
      {items.map((item) => (
        <li key={item.orderItemId} className="flex flex-col">
          <div className="flex items-end gap-xs">
            <p className="min-w-0 text-[15px] font-medium leading-[22px] text-text">
              {`${item.quantity}× ${item.itemName}`}
            </p>
            <span
              aria-hidden="true"
              className="mb-1.5 min-w-[16px] flex-1 border-b-2 border-dotted border-border"
            />
            <Money amountVnd={item.lineTotal} className="shrink-0 whitespace-nowrap" />
          </div>
          <p className="text-body-sm text-muted">
            <span className="font-tabular">{item.unitPrice.toLocaleString('vi-VN')} đ/món</span>
            {item.note ? (
              <span className="text-[#6B4100] dark:text-[#FFD27A]"> · {item.note}</span>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
