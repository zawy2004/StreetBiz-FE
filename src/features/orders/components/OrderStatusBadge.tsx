import { StatusChip } from '@/components/status';
import type { OrderStatus } from '../types/order.types';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusChip code={status} />;
}
