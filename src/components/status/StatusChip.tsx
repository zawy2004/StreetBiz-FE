import { statusLabel } from '@/core/constants/status-labels';
import { statusTones, type StatusTone } from '@/theme';

type Props =
  | { code: string; label?: undefined; tone?: undefined }
  | { code?: undefined; label: string; tone: StatusTone };

export function StatusChip(props: Props) {
  const resolved =
    'tone' in props && props.tone
      ? { label: props.label, tone: props.tone }
      : statusLabel(props.code!);
  const { label, tone } = resolved;
  const colorsForTone = statusTones[tone];

  return (
    <span
      style={{ backgroundColor: colorsForTone.bg, borderColor: colorsForTone.border, color: colorsForTone.fg }}
      className="inline-flex h-6 w-fit items-center justify-center truncate rounded-full border px-xs text-badge"
    >
      {label.toUpperCase()}
    </span>
  );
}
