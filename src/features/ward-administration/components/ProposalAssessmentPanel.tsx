import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { showToast } from '@/components/feedback';
import { useAuthStore } from '@/store/auth-store';
import { AiSuggestionCard } from './AiSuggestionCard';
import { wardApi, type AiProposalAssessment, type WardCase } from '../ward-api';

const obstructionLabels: Record<AiProposalAssessment['obstructionLevel'], string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  UNKNOWN: 'Chưa rõ',
};
const recommendationLabels: Record<AiProposalAssessment['recommendation'], string> = {
  LIKELY_FEASIBLE: 'Có thể bố trí được',
  NEEDS_SURVEY: 'Cần khảo sát thực địa',
  LIKELY_INFEASIBLE: 'Khó bố trí được',
};

/** AIC-04: assesses whether a vendor-proposed slot leaves at least 1.5 m of pedestrian width.
 * Advisory only -- deciding the proposal itself still goes through WardCaseScreen's own
 * APPROVE/REJECT actions, never through this panel. */
export function ProposalAssessmentPanel({ record }: { record: WardCase }) {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const queryKey = ['ward', userId, 'proposal-assessment', record.id];
  const view = useQuery({ queryKey, queryFn: () => wardApi.proposalAssessment(record.id) });
  const run = useMutation({
    mutationFn: () => wardApi.runProposalAssessment(record.id),
    onSuccess: (result) => client.setQueryData(queryKey, { latest: result, isStale: false }),
    onError: (error) => showToast(error instanceof Error ? error.message : 'Không đánh giá được đề xuất'),
  });

  if (view.isPending) return null;
  const latest = view.data?.latest;
  const isStale = view.data?.isStale ?? false;
  const canRun = record.status === 'PENDING';

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-headline-sm">Đánh giá khả thi vị trí (AIC-04)</h2>
        {canRun && (
          <Button
            label={run.isPending ? 'Đang đánh giá...' : latest ? 'Đánh giá lại' : 'Chạy đánh giá AI'}
            variant="outline"
            size="sm"
            fullWidth={false}
            disabled={run.isPending}
            onPress={() => run.mutate()}
          />
        )}
      </div>

      {!latest && !run.isPending && (
        <p className="mt-sm text-body-sm text-muted">Chưa có đánh giá nào cho đề xuất này.</p>
      )}

      {latest && (
        <div className="mt-sm">
          {isStale && (
            <p role="alert" className="mb-sm text-body-sm text-error">
              ⚠️ Đề xuất đã thay đổi (vị trí, kích thước hoặc ảnh) kể từ lần đánh giá này. Kết quả dưới
              đây đã lỗi thời.
            </p>
          )}
          <AiSuggestionCard
            title={
              latest.isAiGenerated
                ? `${recommendationLabels[latest.recommendation]} [AI]`
                : `${recommendationLabels[latest.recommendation]} [Hệ thống — chưa xác minh bằng AI]`
            }
            aiLogId={latest.aiLogId}
          >
            <p>
              Bề rộng vỉa hè ước lượng:{' '}
              {latest.estimatedSidewalkWidthMeters != null
                ? `${latest.estimatedSidewalkWidthMeters} m`
                : 'chưa ước lượng được'}
            </p>
            <p className={latest.remainingPedestrianWidthMeters != null && latest.remainingPedestrianWidthMeters < 1.5 ? 'font-medium text-error' : undefined}>
              Lối đi bộ còn lại:{' '}
              {latest.remainingPedestrianWidthMeters != null
                ? `${latest.remainingPedestrianWidthMeters} m`
                : 'chưa ước lượng được'}{' '}
              (yêu cầu tối thiểu 1,5 m)
            </p>
            <p>
              Mức cản trở: {obstructionLabels[latest.obstructionLevel]} · Độ tin cậy: {latest.confidence}%
            </p>
            {latest.reasons.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-body-sm">
                {latest.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}
            {latest.ruleChecks.length > 0 && (
              <div className="mt-sm border-t border-border pt-sm">
                <p className="text-body-xs font-semibold text-muted">KẾT QUẢ KIỂM TRA QUY TẮC:</p>
                <ul className="mt-1 list-disc pl-4 text-body-sm">
                  {latest.ruleChecks.map((issue, i) => (
                    <li key={i} className={issue.severity === 'BLOCK' ? 'text-error' : undefined}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AiSuggestionCard>
        </div>
      )}
    </Card>
  );
}
