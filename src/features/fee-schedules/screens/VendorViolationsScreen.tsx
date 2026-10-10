import { Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { useVendorViolations } from '../useFinance';
import { daysSinceLatest, hcmDay, penaltyTotals, weekBuckets } from '../finance-view';
import { LoadingBlock, RowSkeletons } from '../components/FinanceParts';
import { useEntered } from '../components/finance-styles';
import { CleanDaysBoard, PenaltyTotals, ViolationSheet } from '../components/ViolationParts';

/**
 * V31 Lịch sử vi phạm: how long the stall has gone without a new notice (and
 * the last twelve weeks), the penalty money by where it stands, then every
 * notice as a sheet with a status margin. One GET as before. Notices are
 * written by ward officers; nothing here is an AI suggestion.
 */
export function VendorViolationsScreen() {
  const { violations, isLoading, isError, error, refetch } = useVendorViolations();
  const entered = useEntered(!isLoading && !isError && violations.length > 0);

  const now = new Date();
  const days = daysSinceLatest(violations, now);
  const latest = violations.reduce<string | null>(
    (best, v) => (best === null || hcmDay(v.recordedAt) > hcmDay(best) ? v.recordedAt : best),
    null,
  );

  return (
    <Screen>
      <AppHeader title="Lịch sử vi phạm" back />
      {isLoading ? (
        <LoadingBlock>
          <Skeleton className="h-[200px] w-full !rounded-[28px]" />
          <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
            <Skeleton className="col-span-2 h-[104px] w-full !rounded-[18px] sm:col-span-1" />
            <Skeleton className="h-[104px] w-full !rounded-[18px]" />
            <Skeleton className="h-[104px] w-full !rounded-[18px]" />
          </div>
          <RowSkeletons count={2} height="h-[132px]" />
        </LoadingBlock>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : violations.length === 0 ? (
        <EmptyState
          icon="shield-check-outline"
          title="Không có vi phạm nào"
          description="Giữ vỉa hè gọn gàng, quán bạn đang làm rất tốt."
        />
      ) : (
        <>
          <CleanDaysBoard
            days={days ?? 0}
            latestDate={latest ? new Date(latest).toLocaleDateString('vi-VN') : ''}
            weeks={weekBuckets(violations, now)}
            entered={entered}
          />
          <PenaltyTotals totals={penaltyTotals(violations)} />
          <div className="flex flex-col gap-sm">
            {violations.map((v) => (
              <ViolationSheet key={v.violationId} violation={v} />
            ))}
          </div>
          <p className="flex items-start gap-xs rounded-[16px] bg-card px-md py-sm text-body-md text-text ring-1 ring-border/80">
            <span className="mt-0.5 shrink-0 text-tertiary">
              <Icon name="information-outline" size={18} color="currentColor" />
            </span>
            Biên bản do Cán bộ Phường lập. Tiền phạt nộp ở mục Tài chính, tab Biên bản phạt.
          </p>
        </>
      )}
    </Screen>
  );
}
