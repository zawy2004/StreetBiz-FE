import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import { InfoRows } from '@/features/sidewalk-slots/components/InfoRows';
import { TransferTimeline } from '@/features/sidewalk-slots/components/TransferTimeline';
import { transferSteps } from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export function AcceptTransferScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const transferId = Number(id);
  const validId = Number.isFinite(transferId);
  const [confirmDecline, setConfirmDecline] = useState(false);

  // SIDE-13 has no GET-by-id -- the incoming list is the only place a
  // transfer's own data can be read from.
  const incoming = useQuery({
    queryKey: ['side', userId, 'transfers', 'incoming'],
    queryFn: () => sideApi.listTransfers('incoming'),
    enabled: validId,
  });
  const { registrations } = useRegistrations();

  const done = (message: string) => {
    showToast(message);
    void queryClient.invalidateQueries({ queryKey: ['side', userId, 'transfers'] });
    navigate(-1);
  };
  const accept = useMutation({
    mutationFn: () => sideApi.acceptTransfer(transferId),
    onSuccess: (result) => done(result.message),
    onError: (error) => showToast(error instanceof SideApiError ? error.message : 'Không chấp nhận được yêu cầu.'),
  });
  const decline = useMutation({
    mutationFn: () => sideApi.declineTransfer(transferId),
    onSuccess: (result) => done(result.message),
    onError: (error) => showToast(error instanceof SideApiError ? error.message : 'Không từ chối được yêu cầu.'),
    onSettled: () => setConfirmDecline(false),
  });

  if (!validId) return <ErrorState message="Mã yêu cầu không hợp lệ." />;
  if (incoming.isPending) return <LoadingState />;
  if (incoming.error) return <ErrorState message={incoming.error.message} onRetry={() => void incoming.refetch()} />;
  const transfer = incoming.data.find((t) => t.transferId === transferId);
  if (!transfer) return <ErrorState message="Không tìm thấy yêu cầu." />;

  const hasApprovedRegistration = registrations.some((r) => r.registrationStatus === 'APPROVED');
  const pending = transfer.transferStatus === 'PENDING';
  const steps = transferSteps(transfer.transferStatus);

  return (
    <Screen
      footer={
        pending ? (
          <StickyActions>
            <div className="mx-auto flex w-full max-w-xl gap-sm">
              <div className="flex-1">
                <Button label="Từ chối" variant="outline" onPress={() => setConfirmDecline(true)} />
              </div>
              <div className="flex-[2]">
                <Button
                  label="Chấp nhận chuyển nhượng"
                  disabled={!hasApprovedRegistration}
                  loading={accept.isPending}
                  onPress={() => accept.mutate()}
                />
              </div>
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-md">
        <AppHeader title="Chuyển nhượng ô" back subtitle="Yêu cầu chuyển nhượng gửi đến bạn" />

        <Card>
          <div className="flex flex-col gap-sm">
            <div className="flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <p className="text-headline-md text-text">Yêu cầu #{transfer.transferId}</p>
                <p className="text-body-sm text-muted">Từ hộ kinh doanh khác gửi cho bạn</p>
              </div>
              <div className="shrink-0">
                <StatusChip code={transfer.transferStatus} />
              </div>
            </div>
            {steps && <TransferTimeline steps={steps} />}
            <InfoRows rows={[{ label: 'Ngày gửi', value: formatDate(transfer.initiatedAt) }]} />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Ô được chuyển nhượng</p>
            <ContractSummary
              contract={{
                slotCode: transfer.slotCode,
                zoneName: transfer.zoneName,
                startDate: transfer.contractStartDate,
                endDate: transfer.contractEndDate,
              }}
              live={steps !== null}
            />
          </div>
        </Card>

        <Callout tone="neutral">
          Nếu bạn chấp nhận, yêu cầu chuyển sang Phường duyệt. Việc chuyển nhượng chỉ có hiệu lực khi Phường duyệt.
        </Callout>
        {pending && !hasApprovedRegistration && (
          <Callout tone="pending">
            Bạn cần có hồ sơ đăng ký kinh doanh đã được duyệt trước khi nhận chuyển nhượng.
          </Callout>
        )}
      </div>

      <ConfirmDialog
        visible={confirmDecline}
        title="Từ chối yêu cầu chuyển nhượng?"
        description="Yêu cầu sẽ chuyển sang trạng thái từ chối và không thể hoàn tác."
        confirmLabel="Từ chối"
        confirmVariant="danger"
        onConfirm={() => decline.mutate()}
        onCancel={() => setConfirmDecline(false)}
      />
    </Screen>
  );
}
