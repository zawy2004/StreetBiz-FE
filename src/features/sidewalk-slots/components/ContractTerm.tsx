import { colors } from '@/theme';
import { contractProgress } from '../my-slots-view';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

type Props = { startDate: string; endDate: string; today: Date; live: boolean };

/** The rental period, and for a live contract how far into it we are and how many days remain. */
export function ContractTerm({ startDate, endDate, today, live }: Props) {
  const progress = contractProgress(startDate, endDate, today);
  const barColor = progress.expiringSoon ? colors.secondary : colors.tertiary;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-sm text-body-sm">
        <span className="text-muted">
          {formatDate(startDate)} – {formatDate(endDate)}
        </span>
        {live && (
          <span className="font-semibold" style={{ color: barColor }}>
            Còn {progress.daysLeft} ngày
          </span>
        )}
      </div>
      {live && (
        <div
          role="progressbar"
          aria-label="Tiến độ thời hạn thuê"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          className="h-1.5 overflow-hidden rounded-full bg-border"
        >
          <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, backgroundColor: barColor }} />
        </div>
      )}
    </div>
  );
}
