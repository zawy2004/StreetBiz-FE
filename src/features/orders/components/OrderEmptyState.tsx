import { EmptyState } from '@/components/feedback';

export function OrderEmptyState({ vendor = false }: { vendor?: boolean }) {
  return (
    <EmptyState
      icon="receipt-text-outline"
      title={vendor ? 'Không có đơn trong trạng thái này' : 'Bạn chưa có đơn hàng nào'}
    />
  );
}
