import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import { orderApi } from '../../api/orderApi';
import { orderKeys } from '../../hooks/useOrders';
import type { OrderListFilters } from '../../types/order.types';

/** The newest-new-order page the shell already polls; read here from the cache only. */
const NEWEST_PLACED: OrderListFilters = { status: 'PLACED', page: 1, pageSize: 1 };

/**
 * "{n} đơn mới đang chờ": a way back to the board. It never fetches
 * (`enabled: false`); it shows what the shell's new-order poll last read.
 */
export function NewOrdersHint() {
  const navigate = useNavigate();
  const waiting = useQuery({
    queryKey: orderKeys.vendorList(NEWEST_PLACED),
    queryFn: () => orderApi.vendorOrders(NEWEST_PLACED),
    enabled: false,
  });
  const count = waiting.data?.totalItems ?? 0;
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={() => navigate('/vendor/orders')}
      className="flex min-h-12 w-full items-center justify-between gap-sm rounded-[16px] bg-tint-primary px-md text-left text-[16px] font-semibold text-primary transition-colors hover:bg-primary/15"
    >
      <span className="flex items-center gap-xs">
        <Icon name="bell-ring" size={20} color="currentColor" />
        {count} đơn mới đang chờ
      </span>
      <Icon name="chevron-right" size={20} color="currentColor" />
    </button>
  );
}
