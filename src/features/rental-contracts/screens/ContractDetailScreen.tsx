import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { ActionRow } from '@/features/sidewalk-slots/components/ActionRow';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractTerm } from '@/features/sidewalk-slots/components/ContractTerm';
import { InfoRows } from '@/features/sidewalk-slots/components/InfoRows';
import { contractProgress } from '@/features/sidewalk-slots/my-slots-view';
import { formatAreaSqm, formatHours, formatSize } from '@/features/sidewalk-slots/slot-format';
import { useAuthStore } from '@/store/auth-store';

export function ContractDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const slot = useQuery({
    queryKey: ['side', 'slot', contract.data?.slotId],
    queryFn: () => sideApi.getSlot(contract.data!.slotId),
    enabled: !!contract.data,
  });

  const renewals = useQuery({
    queryKey: ['side', userId, 'contract', contractId, 'renewals'],
    queryFn: () => sideApi.listRenewals(contractId),
    enabled: validId,
  });
  const openRenewal = renewals.data?.find(
    (r) => r.renewalStatus === 'PENDING' || r.renewalStatus === 'UNDER_REVIEW',
  );

  const withdrawRenewal = useMutation({
    mutationFn: () => sideApi.withdrawRenewal(contractId, openRenewal!.renewalId),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'contract', contractId, 'renewals'] });
    },
    onError: (err) => showToast(err instanceof SideApiError ? err.message : 'Không rút được đơn gia hạn.'),
  });

  if (!validId) return <ErrorState message="Mã hợp đồng không hợp lệ." />;
  if (contract.isPending) return <LoadingState />;
  if (contract.error) return <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />;

  const data = contract.data;
  const isActive = data.contractStatus === 'ACTIVE';
  const live = isActive || data.contractStatus === 'SUSPENDED';
  const today = new Date();
  const expiringSoon = isActive && contractProgress(data.startDate, data.endDate, today).expiringSoon;
  const size = slot.data
    ? [formatSize(slot.data.widthMeters, slot.data.lengthMeters), formatAreaSqm(slot.data.widthMeters, slot.data.lengthMeters)]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  const go = (path: string) => () => navigate(`/vendor/slots/contracts/${data.contractId}/${path}`);

  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-md">
        <AppHeader title={data.slotCode} back subtitle={data.zoneName} />

        <Card>
          <div className="flex flex-col gap-sm">
            <div className="flex items-start justify-between gap-sm">
              <div>
                <p className="text-badge uppercase text-muted">Đơn giá ngày</p>
                {slot.data ? (
                  <p>
                    <Money amountVnd={slot.data.pricePerDay} size="lg" />
                    <span className="ml-1 text-body-sm text-muted">/ ngày</span>
                  </p>
                ) : (
                  <p className="text-body-md text-muted">—</p>
                )}
              </div>
              <div className="shrink-0">
                <StatusChip code={data.contractStatus} />
              </div>
            </div>

            <ContractTerm startDate={data.startDate} endDate={data.endDate} today={today} live={live} />

            <InfoRows
              rows={[
                { label: 'Tuyến phố', value: data.zoneName },
                { label: 'Kích thước', value: size },
                { label: 'Giờ bán', value: slot.data && formatHours(slot.data.availableFrom, slot.data.availableTo) },
                { label: 'Mã hợp đồng', value: `#${data.contractId}` },
              ]}
            />

            {expiringSoon && !openRenewal && (
              <Callout tone="pending">Hợp đồng sắp hết hạn. Gia hạn để tiếp tục thuê ô này.</Callout>
            )}
            {openRenewal && (
              <Callout tone="pending">
                <div className="flex flex-col gap-xs">
                  <span>
                    Đơn xin gia hạn thêm {openRenewal.requestedTermDays} ngày đang{' '}
                    {openRenewal.renewalStatus === 'UNDER_REVIEW' ? 'được xét duyệt' : 'chờ xử lý'}. Phường sẽ xử lý
                    trong thời hạn quy định.
                  </span>
                  <Button
                    label="Rút đơn gia hạn"
                    variant="outline"
                    loading={withdrawRenewal.isPending}
                    onPress={() => withdrawRenewal.mutate()}
                  />
                </div>
              </Callout>
            )}
            {data.cancellationReason && (
              <Callout tone="neutral">
                <strong>Lý do huỷ:</strong> {data.cancellationReason}
              </Callout>
            )}
          </div>
        </Card>

        {isActive && (
          <Section title="Thao tác">
            <div className="flex flex-col gap-sm">
              <ActionRow
                tone="primary"
                icon="qrcode"
                title="Giấy phép QR"
                subtitle="Xuất trình khi cán bộ kiểm tra"
                onPress={go('permit')}
              />
              <ActionRow
                icon="timer-outline"
                title="Gia hạn"
                subtitle="Gửi yêu cầu kéo dài thời hạn thuê"
                attention={expiringSoon}
                onPress={go('renewal')}
              />
              <ActionRow
                icon="swap-horizontal"
                title="Chuyển nhượng"
                subtitle="Chuyển ô cho hộ kinh doanh khác"
                onPress={go('transfer')}
              />
              <ActionRow
                tone="danger"
                icon="close-circle-outline"
                title="Trả ô"
                subtitle="Kết thúc hợp đồng trước hạn"
                onPress={go('return')}
              />
            </div>
          </Section>
        )}
      </div>
    </Screen>
  );
}
