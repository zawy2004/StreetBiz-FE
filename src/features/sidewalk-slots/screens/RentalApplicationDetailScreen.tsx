import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { ApplicationNote } from '../components/ApplicationNote';
import { InfoRows } from '../components/InfoRows';
import { formatAreaSqm, formatHours, formatSize } from '../slot-format';

const APPLICATION_METHOD_LABEL: Record<string, string> = {
  AUTO_ADJACENT: 'Ô liền kề mặt tiền',
  MANUAL_SELECTED: 'Ô mở',
};

// SIDE-04: mirrors ApplicationStatuses.Open on the backend -- the only
// statuses a withdraw is still meaningful for.
const WITHDRAWABLE_STATUSES = ['PENDING', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export function RentalApplicationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const applicationId = Number(id);
  const validId = Number.isFinite(applicationId);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

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
    onSettled: () => setConfirmWithdraw(false),
  });

  if (!validId) return <ErrorState message="Mã đơn không hợp lệ." />;
  if (application.isPending) return <LoadingState />;
  if (application.error) {
    return <ErrorState message={application.error.message} onRetry={() => void application.refetch()} />;
  }
  const app = application.data;
  const canWithdraw = WITHDRAWABLE_STATUSES.includes(app.applicationStatus);
  const size = slot.data
    ? [formatSize(slot.data.widthMeters, slot.data.lengthMeters), formatAreaSqm(slot.data.widthMeters, slot.data.lengthMeters)]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  return (
    <Screen
      footer={
        canWithdraw ? (
          <StickyActions>
            <div className="mx-auto w-full max-w-2xl">
              <Button
                label="Rút đơn"
                variant="outline"
                loading={withdraw.isPending}
                onPress={() => setConfirmWithdraw(true)}
              />
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-md">
        <AppHeader title="Chi tiết đơn thuê" back subtitle={slot.data ? `${slot.data.slotCode} · ${slot.data.zoneName}` : undefined} />

        <Card>
          <div className="flex flex-col gap-sm">
            <div className="flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <p className="text-badge uppercase text-muted">Hình thức</p>
                <p className="text-headline-md text-text">
                  {APPLICATION_METHOD_LABEL[app.applicationMethod] ?? app.applicationMethod}
                </p>
              </div>
              <div className="shrink-0">
                <StatusChip code={app.applicationStatus} />
              </div>
            </div>

            <ApplicationNote app={app} />

            <InfoRows
              rows={[
                { label: 'Ngày nộp', value: formatDate(app.createdAt) },
                { label: 'Thời hạn thuê', value: `${app.requestedTermDays} ngày` },
                { label: 'Ngày Phường xem xét', value: app.reviewedAt ? formatDate(app.reviewedAt) : undefined },
                { label: 'Mã đơn', value: `#${app.applicationId}` },
              ]}
            />
          </div>
        </Card>

        {slot.data && (
          <Card>
            <div className="flex flex-col gap-sm">
              <p className="text-headline-sm text-text">Ô đăng ký thuê</p>
              <div className="flex items-baseline justify-between gap-sm">
                <span className="text-body-sm text-muted">Đơn giá ngày</span>
                <span>
                  <Money amountVnd={slot.data.pricePerDay} size="lg" />
                  <span className="ml-1 text-body-sm text-muted">/ ngày</span>
                </span>
              </div>
              <InfoRows
                rows={[
                  { label: 'Mã ô', value: slot.data.slotCode },
                  { label: 'Tuyến phố', value: slot.data.zoneName },
                  { label: 'Kích thước', value: size },
                  { label: 'Giờ bán', value: formatHours(slot.data.availableFrom, slot.data.availableTo) },
                ]}
              />
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        visible={confirmWithdraw}
        title="Rút đơn thuê này?"
        description="Đơn sẽ chuyển sang trạng thái đã rút và không thể mở lại. Bạn có thể nộp đơn mới sau."
        confirmLabel="Rút đơn"
        confirmVariant="danger"
        onConfirm={() => withdraw.mutate()}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </Screen>
  );
}
