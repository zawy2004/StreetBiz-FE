import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { FilterChips, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import { extendedEndDate, isLiveContract } from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';

const DEFAULT_TERM_DAYS = '90';
const QUICK_TERMS = ['30', '60', '90', '180'];

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
    onError: (err) => setError(err instanceof SideApiError ? err.message : 'Không gửi được yêu cầu gia hạn.'),
  });

  if (!validId) return <ErrorState message="Mã hợp đồng không hợp lệ." />;
  if (contract.isPending) return <LoadingState />;
  if (contract.error) return <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />;

  const days = Number(termDays);
  const validDays = /^\d+$/.test(termDays.trim()) && days > 0;

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="mx-auto w-full max-w-xl">
            <Button
              label="Gửi yêu cầu gia hạn"
              loading={submit.isPending}
              disabled={!validDays}
              onPress={() => {
                setError(undefined);
                submit.mutate();
              }}
            />
          </div>
        </StickyActions>
      }
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-md">
        <AppHeader title="Gia hạn hợp đồng" back subtitle="Gửi yêu cầu kéo dài thời hạn thuê ô" />

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Hợp đồng hiện tại</p>
            <ContractSummary contract={contract.data} live={isLiveContract(contract.data.contractStatus)} />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Gia hạn thêm</p>
            <FilterChips
              value={termDays}
              onChange={setTermDays}
              options={QUICK_TERMS.map((value) => ({ value, label: `${value} ngày` }))}
            />
            <TextField
              label="Hoặc nhập số ngày"
              value={termDays}
              onChangeText={setTermDays}
              keyboardType="numeric"
              error={termDays.trim() !== '' && !validDays ? 'Nhập số ngày là số nguyên dương.' : undefined}
            />
            {validDays && (
              <p className="text-body-sm text-muted">
                Nếu được duyệt đủ {days} ngày, hợp đồng kéo dài đến{' '}
                <strong className="text-text">
                  {extendedEndDate(contract.data.endDate, days).toLocaleDateString('vi-VN')}
                </strong>
                .
              </p>
            )}
          </div>
        </Card>

        <Callout tone="neutral">Phường sẽ xét duyệt và quyết định ngày hết hạn mới. Hợp đồng vẫn giữ nguyên cho đến khi được duyệt.</Callout>
        {error && <Callout tone="danger">{error}</Callout>}
      </div>
    </Screen>
  );
}
