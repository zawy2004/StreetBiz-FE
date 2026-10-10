import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Icon } from '@/components/common';
import { AppHeader, BottomSheet, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, EmptyState, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { sideApi, SideApiError, type SlotTransferRequest } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractTerm } from '@/features/sidewalk-slots/components/ContractTerm';
import { MySlotsTabs } from '@/features/sidewalk-slots/components/MySlotsTabs';
import { TransferTimeline } from '@/features/sidewalk-slots/components/TransferTimeline';
import { transferSteps } from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';
import { countOutgoingByStage, daysSince } from '../transfer-view';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * Two lanes: requests sent to the vendor, drawn as envelopes waiting to be
 * opened (the only thing here that needs them), and the requests they sent,
 * each on its three-station rail with the date of every step.
 */
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
    onError: (error) =>
      showToast(error instanceof SideApiError ? error.message : 'Không từ chối được yêu cầu.'),
    onSettled: () => setDeclining(undefined),
  });

  const actionableIncoming = incoming.data?.filter((t) => t.transferStatus === 'PENDING') ?? [];
  const today = new Date();

  return (
    <Screen>
      <MySlotsTabs />
      <AppHeader
        title="Chuyển nhượng ô"
        subtitle="Chuyển ô cho hộ khác hoặc nhận ô"
        back
        right={<NewTransferButton />}
      />

      {/* Lane 1: sent to you */}
      <section className="flex flex-col gap-sm">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 className="flex items-center gap-xs font-sign text-[20px] font-bold text-text">
            <Icon name="bell-outline" size={20} color="currentColor" className="text-primary" />
            Gửi đến bạn
          </h2>
          {actionableIncoming.length > 0 ? (
            <span className="rounded-full bg-tint-primary px-sm py-0.5 text-badge uppercase text-primary">
              {actionableIncoming.length} cần xử lý
            </span>
          ) : null}
        </div>
        {incoming.isPending && <LaneSkeleton />}
        {incoming.error && (
          <ErrorState message={incoming.error.message} onRetry={() => void incoming.refetch()} />
        )}
        {incoming.data && actionableIncoming.length === 0 && (
          <EmptyState
            icon="swap-horizontal"
            title="Không có yêu cầu nào"
            description="Khi một hộ khác gửi ô cho bạn, yêu cầu sẽ hiện ở đây để bạn đồng ý hoặc từ chối."
            compact
          />
        )}
        <div className="grid gap-md md:grid-cols-2">
          {actionableIncoming.map((t) => (
            <IncomingEnvelope
              key={t.transferId}
              wide={actionableIncoming.length === 1}
              transfer={t}
              today={today}
              onAccept={() => navigate(`/vendor/slots/transfers/${t.transferId}/accept`)}
              onDecline={() => setDeclining(t)}
            />
          ))}
        </div>
      </section>

      <div aria-hidden="true" className="sb-kerb sb-kerb-thin my-xs rounded-full" />

      {/* Lane 2: sent by you */}
      <section className="flex flex-col gap-sm">
        <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
          <h2 className="flex items-center gap-xs font-sign text-[20px] font-bold text-text">
            <Icon name="send-outline" size={20} color="currentColor" className="text-muted" />
            Bạn đã gửi
          </h2>
          {outgoing.data && outgoing.data.length > 0 ? (
            <OutgoingStats transfers={outgoing.data} />
          ) : null}
        </div>
        {outgoing.isPending && <LaneSkeleton />}
        {outgoing.error && (
          <ErrorState message={outgoing.error.message} onRetry={() => void outgoing.refetch()} />
        )}
        {outgoing.data && outgoing.data.length === 0 && (
          <EmptyState
            icon="swap-horizontal"
            title="Chưa gửi yêu cầu nào"
            description="Bấm Tạo yêu cầu ở đầu trang để chuyển ô đang thuê."
            compact
          />
        )}
        <div className="grid gap-md md:grid-cols-2">
          {outgoing.data?.map((t) => (
            <OutgoingRow key={t.transferId} transfer={t} today={today} />
          ))}
        </div>
      </section>

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

function IncomingEnvelope({
  transfer: t,
  wide,
  today,
  onAccept,
  onDecline,
}: {
  transfer: SlotTransferRequest;
  /** The only request: the envelope takes both columns rather than leaving one empty. */
  wide: boolean;
  today: Date;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const ago = daysSince(t.initiatedAt, today);
  return (
    <article
      className={`relative overflow-hidden rounded-[20px] bg-card shadow-sheet ring-1 ring-brand/25 ${wide ? 'md:col-span-2' : ''}`}
    >
      {/* Envelope flap */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 44"
        preserveAspectRatio="none"
        className="block h-11 w-full"
      >
        <path d="M0 0 H400 L200 40 Z" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
        <path
          d="M0 0 L200 40 L400 0"
          fill="none"
          strokeWidth="2"
          className="stroke-brand"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute left-md top-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF3E8] text-primary shadow-card ring-2 ring-card dark:bg-[#2A2420]"
      >
        <Icon name="bell-outline" size={22} color="currentColor" weight="fill" />
      </span>
      <div className="flex flex-col gap-sm p-md pt-sm md:p-lg md:pt-sm">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <p className="inline-flex h-11 items-center rounded-[9px] bg-card px-sm font-sign text-[22px] font-extrabold leading-none tracking-[0.02em] text-text ring-2 ring-text/85 [font-stretch:72%] md:text-[24px]">
            Mã ô: {t.slotCode}
          </p>
          <StatusChip label="Chờ bạn xác nhận" tone="pending" />
        </div>
        <p className="text-[15px] text-text">{t.zoneName}</p>
        <p className="text-body-sm text-muted">
          Thời hạn thuê: {formatDate(t.contractStartDate)} – {formatDate(t.contractEndDate)}
        </p>
        <p className="flex flex-wrap gap-x-sm text-body-sm text-muted">
          <span>Ngày gửi: {formatDate(t.initiatedAt)}</span>
          <span className="font-semibold text-text">
            {ago === 0 ? 'Gửi hôm nay' : `Gửi ${ago} ngày trước`}
          </span>
        </p>
        <div className="flex items-center gap-xs text-body-sm">
          <span className="rounded-full bg-sunken px-sm py-1 text-muted">
            Từ hộ kinh doanh khác
          </span>
          <Icon name="arrow-right" size={16} color="currentColor" className="text-brand" />
          <span className="rounded-full bg-tint-primary px-sm py-1 font-semibold text-primary">
            Bạn
          </span>
        </div>
        <div className={`mt-xs flex gap-sm ${wide ? 'md:max-w-[520px]' : ''}`}>
          <div className="flex-[2]">
            <Button label="Xem & chấp nhận" onPress={onAccept} />
          </div>
          <div className="flex-1">
            <Button label="Từ chối" variant="outline" onPress={onDecline} />
          </div>
        </div>
      </div>
    </article>
  );
}

function OutgoingRow({ transfer, today }: { transfer: SlotTransferRequest; today: Date }) {
  const steps = transferSteps(transfer.transferStatus);
  const rejected = transfer.transferStatus === 'REJECTED';
  const ago = daysSince(transfer.initiatedAt, today);

  return (
    <article className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="font-sign text-[18px] font-bold leading-6 text-text">
            Mã ô: {transfer.slotCode}
          </p>
          <p className="text-body-sm text-muted">{transfer.zoneName}</p>
          <p className="text-body-sm text-muted">
            Ngày gửi: {formatDate(transfer.initiatedAt)} ·{' '}
            {ago === 0 ? 'hôm nay' : `${ago} ngày trước`}
          </p>
        </div>
        <StatusChip code={transfer.transferStatus} />
      </div>
      {steps && (
        <TransferTimeline
          steps={steps}
          dates={[transfer.initiatedAt, transfer.acceptedAt, transfer.reviewedAt]}
        />
      )}
      {rejected && (
        <div className="border-l-4 border-error">
          <Callout tone="danger">
            <strong>Lý do từ chối:</strong>{' '}
            {transfer.reviewDecisionReason ?? 'Yêu cầu đã bị từ chối.'}
          </Callout>
        </div>
      )}
    </article>
  );
}

/** Four small counts by stage; a zero is dimmed, never hidden. */
function OutgoingStats({ transfers }: { transfers: SlotTransferRequest[] }) {
  const c = countOutgoingByStage(transfers);
  const items = [
    { label: 'Chờ bên nhận', value: c.waitingReceiver, dot: 'bg-accent' },
    { label: 'Chờ Phường', value: c.waitingWard, dot: 'bg-secondary' },
    { label: 'Đã duyệt', value: c.approved, dot: 'bg-tertiary' },
    { label: 'Bị từ chối', value: c.rejected, dot: 'bg-error' },
  ];
  return (
    <div className="grid grid-cols-4 gap-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex min-w-[76px] flex-col rounded-[12px] bg-card px-sm py-1.5 ring-1 ring-border ${
            item.value === 0 ? 'opacity-60' : ''
          }`}
        >
          <span className="font-sign text-[22px] font-bold leading-7 text-text">{item.value}</span>
          <span className="flex items-center gap-1 text-[12px] leading-tight text-muted">
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        </div>
      ))}
    </div>
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
    if (active.length === 0)
      return showToast('Bạn chưa có hợp đồng đang hiệu lực để chuyển nhượng.');
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
        icon={<Icon name="swap-horizontal" size={18} color="currentColor" />}
      />
      <BottomSheet visible={choosing} onClose={() => setChoosing(false)}>
        <h2 className="font-sign text-[20px] font-bold text-text">Chọn ô muốn chuyển nhượng</h2>
        <div className="flex flex-col gap-xs">
          {active.map((c) => (
            <Card key={c.contractId} onPress={() => start(c.contractId)}>
              <div className="flex flex-col gap-xs">
                <div className="flex items-center justify-between gap-sm">
                  <p className="font-sign text-[20px] font-bold text-text">{c.slotCode}</p>
                  <Icon
                    name="chevron-right"
                    size={20}
                    color="currentColor"
                    className="text-muted"
                  />
                </div>
                <p className="text-body-sm text-muted">{c.zoneName}</p>
                <ContractTerm startDate={c.startDate} endDate={c.endDate} today={new Date()} live />
              </div>
            </Card>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

function LaneSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="grid gap-md md:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-sm rounded-[20px] bg-card p-lg ring-1 ring-border"
        >
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
