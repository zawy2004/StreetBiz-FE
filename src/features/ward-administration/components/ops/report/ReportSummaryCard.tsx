import { useId, useState } from 'react';

import { Icon } from '@/components/common';
import type { IconName } from '@/components/common';
import type { ReportSummaryDto, ReportSummaryPoint } from '@/core/api';

/** Points shown before "Xem thêm": enough to read at a glance, not the whole report again. */
const VISIBLE_POINTS = 3;

type Tone = ReportSummaryPoint['tone'];

const TONE: Record<Tone, { icon: IconName; ink: string; chip: string; label: string; rank: number }> = {
  ATTENTION: {
    icon: 'alert-circle-outline',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
    chip: 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]',
    label: 'Cần chú ý',
    rank: 0,
  },
  NEUTRAL: {
    icon: 'information-outline',
    ink: 'text-muted',
    chip: 'bg-sunken text-muted',
    label: 'Thông tin',
    rank: 1,
  },
  POSITIVE: {
    icon: 'check-circle',
    ink: 'text-[#0B5D33] dark:text-[#8BE3B0]',
    chip: 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]',
    label: 'Tốt',
    rank: 2,
  },
};

const TOPIC_LABEL: Record<ReportSummaryPoint['topic'], string> = {
  COLLECTION: 'Thu phí',
  TIMELINESS: 'Đúng hạn',
  DEBT: 'Công nợ',
  VIOLATIONS: 'Vi phạm',
  OCCUPANCY: 'Lấp đầy',
  WORKLOAD: 'Chờ xử lý',
};

/**
 * AIC-08: the period's report in a few sentences. The server writes them from the same rows the
 * figures above show, so nothing here can disagree with them; the officer still decides.
 *
 * What needs a look comes first and only the first few lines are open: the rest is one tap away.
 */
export function ReportSummaryCard({ summary }: { summary: ReportSummaryDto }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  // Stable sort: inside one tone the server's order (collection, debt, violations…) is kept.
  const ordered = summary.points
    .map((point, index) => ({ point, index }))
    .sort((a, b) => TONE[a.point.tone].rank - TONE[b.point.tone].rank || a.index - b.index)
    .map(({ point }) => point);
  const attention = ordered.filter((p) => p.tone === 'ATTENTION').length;
  const hidden = Math.max(0, ordered.length - VISIBLE_POINTS);
  const shown = expanded ? ordered : ordered.slice(0, VISIBLE_POINTS);

  return (
    <section
      aria-label="Tóm tắt kỳ báo cáo"
      className="overflow-hidden rounded-[24px] border border-secondary/40 border-l-[6px] border-l-secondary bg-secondary-bg/60 p-md shadow-card md:p-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <div className="flex items-center gap-xs text-body-md font-semibold text-on-secondary">
          <Icon name="creation" size={18} color="currentColor" weight="fill" />
          Tóm tắt tự động
        </div>
        <span
          className={`rounded-full px-sm py-1 text-body-sm font-semibold ${
            attention > 0 ? TONE.ATTENTION.chip : TONE.POSITIVE.chip
          }`}
        >
          {attention > 0 ? `${attention} điểm cần chú ý` : 'Không có điểm cần chú ý'}
        </span>
      </div>

      <p className="mt-sm text-headline-md font-semibold text-text">{summary.headline}</p>

      <ul id={listId} className="mt-md flex flex-col gap-xs">
        {shown.map((point, index) => {
          const tone = TONE[point.tone];
          return (
            <li
              key={`${point.topic}-${index}`}
              className="flex items-start gap-sm rounded-[14px] bg-card/80 px-sm py-xs ring-1 ring-border"
            >
              <span className={`mt-0.5 shrink-0 ${tone.ink}`}>
                <Icon name={tone.icon} size={20} color="currentColor" weight="fill" />
                <span className="sr-only">{tone.label}: </span>
              </span>
              <div className="min-w-0">
                <span className={`rounded-full px-xs py-0.5 text-[12px] font-semibold ${tone.chip}`}>
                  {TOPIC_LABEL[point.topic]}
                </span>
                <p className="mt-0.5 text-body-md text-text">{point.text}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-sm flex flex-wrap items-center justify-between gap-xs">
        {hidden > 0 ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((open) => !open)}
            className="min-h-10 rounded-full px-sm text-body-md font-semibold text-primary underline-offset-2 hover:underline"
          >
            {expanded ? 'Thu gọn' : `Xem thêm ${hidden} mục`}
          </button>
        ) : (
          <span />
        )}
        <p className="text-body-xs text-muted">{summary.basis}</p>
      </div>
    </section>
  );
}
