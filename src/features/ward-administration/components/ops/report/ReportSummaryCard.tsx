import { Icon } from '@/components/common';
import type { IconName } from '@/components/common';
import type { ReportSummaryDto, ReportSummaryPoint } from '@/core/api';

const TONE: Record<
  ReportSummaryPoint['tone'],
  { icon: IconName; ink: string; label: string }
> = {
  POSITIVE: { icon: 'check-circle', ink: 'text-[#0B5D33] dark:text-[#8BE3B0]', label: 'Tốt' },
  NEUTRAL: { icon: 'information-outline', ink: 'text-muted', label: 'Thông tin' },
  ATTENTION: {
    icon: 'alert-circle-outline',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
    label: 'Cần chú ý',
  },
};

/**
 * AIC-08: the period's report in a few sentences. The server writes them from the same rows the
 * tables below show, so nothing here can disagree with the figures; the officer still decides.
 */
export function ReportSummaryCard({ summary }: { summary: ReportSummaryDto }) {
  return (
    <section
      aria-label="Tóm tắt kỳ báo cáo"
      className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
    >
      <div className="flex items-center gap-xs text-body-sm font-semibold text-muted">
        <Icon name="creation" size={16} color="currentColor" weight="fill" />
        Tóm tắt tự động
      </div>
      <p className="mt-xs text-headline-sm text-text">{summary.headline}</p>

      <ul className="mt-sm flex flex-col gap-xs">
        {summary.points.map((point, index) => {
          const tone = TONE[point.tone];
          return (
            <li key={`${point.topic}-${index}`} className="flex items-start gap-xs text-body-md text-text">
              <span className={`mt-0.5 shrink-0 ${tone.ink}`}>
                <Icon name={tone.icon} size={18} color="currentColor" weight="fill" />
                <span className="sr-only">{tone.label}: </span>
              </span>
              <span className="min-w-0">{point.text}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-sm text-body-xs text-muted">{summary.basis}</p>
    </section>
  );
}
