type Props = { size?: number; color?: string; className?: string };

/** Small CSS spinner — web replacement for RN's ActivityIndicator. */
export function Spinner({ size = 16, color = 'currentColor', className }: Props) {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ''}`}
      style={{ width: size, height: size, color }}
    />
  );
}
