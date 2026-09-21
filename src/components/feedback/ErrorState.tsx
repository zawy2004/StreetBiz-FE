import { Button } from '@/components/common';
import { EmptyState } from './EmptyState';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = 'Kiểm tra kết nối mạng rồi tải lại.', onRetry }: Props) {
  return (
    <EmptyState
      tone="danger"
      icon="alert-circle-outline"
      title="Không tải được dữ liệu"
      description={message}
      action={onRetry ? <Button label="Thử lại" variant="outline" fullWidth={false} onPress={onRetry} /> : undefined}
    />
  );
}
