import { Divider, ListRow, Money } from '@/components/common';
import type { OrderItem } from '../types/order.types';

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <div className="px-md">
      {items.map((item, index) => (
        <div key={item.orderItemId}>
          {index > 0 ? <Divider /> : null}
          <ListRow
            title={`${item.quantity}× ${item.itemName}`}
            subtitle={item.note ?? undefined}
            trailing={
              <div className="text-right">
                <Money amountVnd={item.lineTotal} />
                <p className="text-body-sm text-muted">
                  {item.unitPrice.toLocaleString('vi-VN')} đ/món
                </p>
              </div>
            }
          />
        </div>
      ))}
    </div>
  );
}
