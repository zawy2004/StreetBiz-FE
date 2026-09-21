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
      style={{ backgroundColor: colorsForTone.bg, color: colorsForTone.fg }}
      className="inline-flex h-6 w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-badge"
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {label.toUpperCase()}
    </span>
  );
}
