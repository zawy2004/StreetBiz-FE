import { Button } from '@/components/common';
import { EmptyState } from './EmptyState';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = 'Có lỗi xảy ra. Vui lòng thử lại.', onRetry }: Props) {
  return (
    <EmptyState
      icon="alert-circle-outline"
      title="Không tải được dữ liệu"
      description={message}
      action={onRetry ? <Button label="Thử lại" variant="outline" onPress={onRetry} /> : undefined}
    />
  );
}
