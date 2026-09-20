import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Icon } from '@/components/common';
import { AppHeader, BottomSheet, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError, type SlotTransferRequest } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { MySlotsTabs } from '@/features/sidewalk-slots/components/MySlotsTabs';
import { TransferTimeline } from '@/features/sidewalk-slots/components/TransferTimeline';
import { transferSteps } from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export function TransfersListScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [declining, setDeclining] = useState<SlotTransferRequest>();

  const incoming = useQuery({
    queryKey: ['side', userId, 'transfers', 'incoming'],
    queryFn: () => sideApi.listTransfers('incoming'),
  });
  const outgoing = useQuery({
    queryKey: ['side', userId, 'transfers', 'outgoing'],
    queryFn: () => sideApi.listTransfers('outgoing'),
  });

  const decline = useMutation({
    mutationFn: (transferId: number) => sideApi.declineTransfer(transferId),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'transfers'] });
    },
    onError: (error) => showToast(error instanceof SideApiError ? error.message : 'Không từ chối được yêu cầu.'),
    onSettled: () => setDeclining(undefined),
  });

  const actionableIncoming = incoming.data?.filter((t) => t.transferStatus === 'PENDING') ?? [];

  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-md">
        <MySlotsTabs />
        <AppHeader title="Chuyển nhượng ô" subtitle="Chuyển ô cho hộ khác hoặc nhận ô" back />
        <div className="flex justify-end">
          <NewTransferButton />
        </div>

        <Section
          title="Yêu cầu gửi đến bạn"
          action={
            actionableIncoming.length > 0 ? (
              <span className="rounded-full bg-tint-primary px-xs text-badge uppercase text-primary">
                {actionableIncoming.length} cần xử lý
              </span>
            ) : undefined
          }
        >
          {incoming.isPending && <LoadingState />}
          {incoming.error && <ErrorState message={incoming.error.message} onRetry={() => void incoming.refetch()} />}
          {incoming.data && actionableIncoming.length === 0 && (
            <EmptyState icon="swap-horizontal" title="Không có yêu cầu nào" />
          )}
          <div className="grid gap-sm md:grid-cols-2">
            {actionableIncoming.map((t) => (
              <Card key={t.transferId} style={{ borderLeft: `4px solid ${colors.primary}` }}>
                <div className="flex flex-col gap-sm">
                  <div className="flex items-start justify-between gap-sm">
                    <div className="flex min-w-0 items-center gap-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-primary">
                        <Icon name="bell-outline" size={22} color={colors.primary} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-headline-sm text-text">Mã ô: {t.slotCode}</p>
                        <p className="truncate text-body-sm text-muted">{t.zoneName}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusChip label="Chờ bạn xác nhận" tone="pending" />
                    </div>
                  </div>
                  <p className="text-body-sm text-muted">
                    Thời hạn thuê: {formatDate(t.contractStartDate)} – {formatDate(t.contractEndDate)} · Ngày gửi:{' '}
                    {formatDate(t.initiatedAt)}
                  </p>
                  <div className="flex gap-sm">
                    <div className="flex-1">
                      <Button
                        label="Xem & chấp nhận"
                        onPress={() => navigate(`/vendor/slots/transfers/${t.transferId}/accept`)}
                      />
                    </div>
                    <div className="flex-1">
                      <Button label="Từ chối" variant="outline" onPress={() => setDeclining(t)} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Yêu cầu đã gửi">
          {outgoing.isPending && <LoadingState />}
          {outgoing.error && <ErrorState message={outgoing.error.message} onRetry={() => void outgoing.refetch()} />}
          {outgoing.data && outgoing.data.length === 0 && <EmptyState icon="swap-horizontal" title="Chưa gửi yêu cầu nào" />}
          <div className="grid gap-sm md:grid-cols-2">
            {outgoing.data?.map((t) => <OutgoingCard key={t.transferId} transfer={t} />)}
          </div>
        </Section>
      </div>

      <ConfirmDialog
        visible={declining !== undefined}
        title="Từ chối yêu cầu chuyển nhượng?"
        description="Yêu cầu sẽ chuyển sang trạng thái từ chối và không thể hoàn tác."
        confirmLabel="Từ chối"
        confirmVariant="danger"
        onConfirm={() => declining && decline.mutate(declining.transferId)}
        onCancel={() => setDeclining(undefined)}
      />
    </Screen>
  );
}

function OutgoingCard({ transfer }: { transfer: SlotTransferRequest }) {
  const steps = transferSteps(transfer.transferStatus);
  const rejected = transfer.transferStatus === 'REJECTED';

  return (
    <Card style={rejected ? { borderLeft: `4px solid ${colors.error}` } : undefined}>
      <div className="flex flex-col gap-sm">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <p className="text-headline-sm text-text">Mã ô: {transfer.slotCode}</p>
            <p className="text-body-sm text-muted">{transfer.zoneName}</p>
            <p className="text-body-sm text-muted">Ngày gửi: {formatDate(transfer.initiatedAt)}</p>
          </div>
          <div className="shrink-0">
            <StatusChip code={transfer.transferStatus} />
          </div>
        </div>
        {steps && <TransferTimeline steps={steps} />}
        {rejected && (
          <Callout tone="danger">
            <strong>Lý do từ chối:</strong> {transfer.reviewDecisionReason ?? 'Yêu cầu đã bị từ chối.'}
          </Callout>
        )}
      </div>
    </Card>
  );
}

/** Starts a transfer from one of the vendor's active contracts, asking which one when there are several. */
function NewTransferButton() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [choosing, setChoosing] = useState(false);
  const contracts = useQuery({
    queryKey: ['side', userId, 'contracts'],
    queryFn: () => sideApi.listContracts(),
  });
  const active = contracts.data?.filter((c) => c.contractStatus === 'ACTIVE') ?? [];
  const start = (contractId: number) => navigate(`/vendor/slots/contracts/${contractId}/transfer`);

  const onPress = () => {
    if (active.length === 0) return showToast('Bạn chưa có hợp đồng đang hiệu lực để chuyển nhượng.');
    if (active.length === 1 && active[0]) return start(active[0].contractId);
    setChoosing(true);
  };

  return (
    <>
      <Button
        label="Tạo yêu cầu"
        fullWidth={false}
        loading={contracts.isPending}
        onPress={onPress}
        icon={<Icon name="swap-horizontal" size={18} color={colors.onPrimary} />}
      />
      <BottomSheet visible={choosing} onClose={() => setChoosing(false)}>
        <h2 className="text-headline-md text-text">Chọn ô muốn chuyển nhượng</h2>
        <div className="flex flex-col gap-xs">
          {active.map((c) => (
            <Card key={c.contractId} onPress={() => start(c.contractId)}>
              <p className="text-headline-sm text-text">{c.slotCode}</p>
              <p className="text-body-sm text-muted">{c.zoneName}</p>
            </Card>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
