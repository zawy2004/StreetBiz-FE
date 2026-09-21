import { Spinner } from '@/components/common';
import { colors } from '@/theme';

type Props = { label?: string };

export function LoadingState({ label = 'Đang tải' }: Props) {
  return (
    <div className="flex items-center justify-center gap-xs py-xl text-body-sm text-muted">
      <Spinner size={20} color={colors.primary} />
      <span>{label}…</span>
    </div>
  );
}

/** Grey placeholder blocks in the shape of the content that is coming. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-sunken ${className ?? ''}`} />;
}
