import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import {
  contractProgress,
  extendedEndDate,
  isLiveContract,
} from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';
import { RenewalRuler, RenewalSteps, TermPicker } from '../components/renewal/RenewalParts';

const DEFAULT_TERM_DAYS = '90';
const QUICK_TERMS = ['30', '60', '90', '180'];

/**
 * Asking the ward for more time: the current term as a rail with the extension
 * growing out of its end as the vendor picks a number of days, the date it
 * would run to if approved in full, and what happens after sending.
 */
export function RenewalRequestScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const [termDays, setTermDays] = useState(DEFAULT_TERM_DAYS);
  const [error, setError] = useState<string>();

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const submit = useMutation({
    mutationFn: () => sideApi.requestRenewal(contractId, Number(termDays)),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'contract', contractId] });
      navigate(-1);
    },
    onError: (err) =>
      setError(err instanceof SideApiError ? err.message : 'Không gửi được yêu cầu gia hạn.'),
  });

  if (!validId)
    return (
      <Screen>
        <ErrorState message="Mã hợp đồng không hợp lệ." />
      </Screen>
    );
  if (contract.isPending) return <FormSkeleton />;
  if (contract.error)
    return (
      <Screen>
        <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />
      </Screen>
    );

  const days = Number(termDays);
  const validDays = /^\d+$/.test(termDays.trim()) && days > 0;
  const live = isLiveContract(contract.data.contractStatus);
  const progress = contractProgress(contract.data.startDate, contract.data.endDate, new Date());
  const months = validDays && days >= 30 ? Math.round(days / 30) : null;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Gửi yêu cầu gia hạn"
            loading={submit.isPending}
            disabled={!validDays}
            onPress={() => {
              setError(undefined);
              submit.mutate();
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Gia hạn hợp đồng" back subtitle="Gửi yêu cầu kéo dài thời hạn thuê ô" />

      <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          <section className="flex flex-col gap-md overflow-hidden rounded-[24px] bg-card shadow-sheet ring-1 ring-border">
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            <div className="flex flex-col gap-lg px-md pb-md md:px-lg md:pb-lg">
              <div className="flex flex-col gap-xs">
                <p className="text-badge text-muted">HỢP ĐỒNG HIỆN TẠI</p>
                <ContractSummary
                  contract={contract.data}
                  live={live}
                  status={contract.data.contractStatus}
                />
              </div>

              <RenewalRuler
                startDate={contract.data.startDate}
                endDate={contract.data.endDate}
                extraDays={validDays ? days : null}
                today={new Date()}
              />

              {live && progress.expiringSoon ? (
                <p className="flex items-center gap-1.5 rounded-[12px] bg-[#FFF3D1] px-sm py-xs text-body-sm font-semibold text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                  <Icon name="timer-outline" size={16} color="currentColor" />
                  Hợp đồng còn {progress.daysLeft} ngày. Gửi sớm để Phường kịp xét.
                </p>
              ) : null}

              <div className="cq flex flex-col gap-sm">
                <h2 className="font-sign text-[18px] font-bold text-text">Gia hạn thêm</h2>
                <TermPicker options={QUICK_TERMS} value={termDays} onChange={setTermDays} />
                {months ? <p className="text-body-sm text-muted">≈ {months} tháng</p> : null}
                <TextField
                  label="Hoặc nhập số ngày"
                  value={termDays}
                  onChangeText={setTermDays}
                  keyboardType="numeric"
                  error={
                    termDays.trim() !== '' && !validDays
                      ? 'Nhập số ngày là số nguyên dương.'
                      : undefined
                  }
                />
                {validDays && (
                  <p aria-live="polite" className="text-[17px] leading-relaxed text-text">
                    Nếu được duyệt đủ {days} ngày, hợp đồng kéo dài đến{' '}
                    <strong className="font-sign text-[19px] font-bold text-text">
                      {extendedEndDate(contract.data.endDate, days).toLocaleDateString('vi-VN')}
                    </strong>
                    .
                  </p>
                )}
              </div>
              {error && <Callout tone="danger">{error}</Callout>}
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-md">
          <Callout tone="neutral">
            Phường sẽ xét duyệt và quyết định ngày hết hạn mới. Hợp đồng vẫn giữ nguyên cho đến khi
            được duyệt.
          </Callout>
          <RenewalSteps />
        </div>
      </div>
    </Screen>
  );
}

function FormSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải hợp đồng" className="flex flex-col gap-md">
        <Skeleton className="h-9 w-56" />
        <div className="flex flex-col gap-md rounded-[24px] bg-card p-lg ring-1 ring-border">
          <Skeleton className="h-11 w-60" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-xs sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-[14px]" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Screen>
  );
}
