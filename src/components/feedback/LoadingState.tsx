import { Spinner } from '@/components/common';
import { colors } from '@/theme';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-xl">
      <Spinner size={24} color={colors.primary} />
    </div>
  );
}
