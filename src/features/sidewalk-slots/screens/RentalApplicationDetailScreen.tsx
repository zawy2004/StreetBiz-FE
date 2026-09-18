import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

const APPLICATION_METHOD_LABEL: Record<string, string> = {
  AUTO_ADJACENT: 'Ô liền kề mặt tiền',
  MANUAL_SELECTED: 'Ô mở',
};

// SIDE-04: mirrors ApplicationStatuses.Open on the backend -- the only
// statuses a withdraw is still meaningful for.
const WITHDRAWABLE_STATUSES = ['PENDING', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'];

export function RentalApplicationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const applicationId = Number(id);
  const validId = Number.isFinite(applicationId);

  const application = useQuery({
    queryKey: ['side', userId, 'application', applicationId],
    queryFn: () => sideApi.getApplication(applicationId),
    enabled: validId,
  });

  const slot = useQuery({
    queryKey: ['side', 'slot', application.data?.slotId],
    queryFn: () => sideApi.getSlot(application.data!.slotId),
    enabled: !!application.data,
  });

  const withdraw = useMutation({
    mutationFn: () => sideApi.withdrawApplication(applicationId),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'applications'] });
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'application', applicationId] });
    },
    onError: (error) => {
      showToast(error instanceof SideApiError ? error.message : 'Không rút được đơn.');
    },
  });

  if (!validId) return <ErrorState message="Mã đơn không hợp lệ." />;
  if (application.isPending) return <LoadingState />;
  if (application.error)
    return (
      <ErrorState
        message={
          application.error instanceof SideApiError ? application.error.message : application.error.message
        }
        onRetry={() => void application.refetch()}
      />
    );
  const app = application.data;
  const canWithdraw = WITHDRAWABLE_STATUSES.includes(app.applicationStatus);

  return (
    <Screen
      footer={
        canWithdraw ? (
          <StickyActions>
            <Button
              label="Rút đơn"
              variant="outline"
              loading={withdraw.isPending}
              onPress={() => withdraw.mutate()}
            />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Chi tiết đơn thuê" back />
      <Card>
        <div className="flex justify-between">
          <span className="text-headline-sm text-text">
            {APPLICATION_METHOD_LABEL[app.applicationMethod] ?? app.applicationMethod}
          </span>
          <StatusChip code={app.applicationStatus} />
        </div>
        <p className="mt-1 text-body-sm text-muted">
          Nộp ngày {new Date(app.createdAt).toLocaleDateString('vi-VN')}
        </p>
        {app.reviewDecisionReason ? (
          <p className="mt-1 text-body-sm text-muted">Ghi chú: {app.reviewDecisionReason}</p>
        ) : null}
      </Card>
      {slot.data ? (
        <Card padded={false}>
          <div className="px-md">
            <ListRow
              title={slot.data.slotCode}
              subtitle={slot.data.zoneName}
              trailing={<Money amountVnd={slot.data.pricePerDay} />}
            />
            <Divider />
            <ListRow
              title="Số ngày yêu cầu"
              subtitle={`${app.requestedTermDays} ngày`}
            />
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
