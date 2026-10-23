import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { aiApi } from '@/core/api/ai-api';

/**
 * AIP-04: what reviewers keep saying about this stall, in a few lines. It shows only when the server
 * has a summary (enough written reviews and the model answered); otherwise it takes no room at all,
 * because the reviews themselves are the source of truth and a missing summary is not an error.
 */
export function ReviewSummaryCard({ storefrontId }: { storefrontId: number }) {
  const summary = useQuery({
    queryKey: ['ai', 'review-summary', storefrontId],
    queryFn: () => aiApi.reviewSummary(storefrontId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const data = summary.data;
  if (!data?.available || !data.summary) return null;

  return (
    <section
      aria-labelledby="review-summary-title"
      className="rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <h2
        id="review-summary-title"
        className="flex items-center gap-xs font-editorial text-[22px] font-semibold leading-tight text-text"
      >
        <Icon name="creation" size={20} color="currentColor" weight="fill" className="text-on-secondary" />
        Khách nói gì về quán
      </h2>
      <p className="mt-sm text-body-lg text-text">{data.summary}</p>
      {data.positives.length > 0 ? (
        <ul aria-label="Điểm được khen" className="mt-sm flex flex-col gap-1">
          {data.positives.map((point) => (
            <li key={point} className="flex items-start gap-xs text-body-md text-text">
              <Icon name="check-circle-outline" size={17} color="currentColor" className="mt-[3px] shrink-0 text-tertiary" />
              {point}
            </li>
          ))}
        </ul>
      ) : null}
      {data.negatives.length > 0 ? (
        <ul aria-label="Điểm cần cải thiện" className="mt-xs flex flex-col gap-1">
          {data.negatives.map((point) => (
            <li key={point} className="flex items-start gap-xs text-body-md text-text">
              <Icon name="information-outline" size={17} color="currentColor" className="mt-[3px] shrink-0 text-muted" />
              {point}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-sm text-body-sm text-muted">
        AI tóm tắt từ {data.reviewCount} đánh giá của khách · chỉ để tham khảo.
      </p>
    </section>
  );
}
