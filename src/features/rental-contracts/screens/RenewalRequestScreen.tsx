import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

const DEFAULT_TERM_DAYS = '90';

export function RenewalRequestScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const [termDays, setTermDays] = useState(DEFAULT_TERM_DAYS);

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
    onError: (error) => {
      showToast(error instanceof SideApiError ? error.message : 'Không gửi được yêu cầu gia hạn.');
    },
  });

  if (!validId) return <ErrorState message="Mã hợp đồng không hợp lệ." />;
  if (contract.isPending) return <LoadingState />;
  if (contract.error)
    return (
      <ErrorState
        message={contract.error instanceof SideApiError ? contract.error.message : contract.error.message}
        onRetry={() => void contract.refetch()}
      />
    );
  const currentEnd = new Date(contract.data.endDate);
  const days = Number(termDays);
  const validDays = Number.isFinite(days) && days > 0;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Gửi yêu cầu gia hạn"
            loading={submit.isPending}
            disabled={!validDays}
            onPress={() => submit.mutate()}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Gia hạn hợp đồng" back subtitle={contract.data.slotCode} />
      <Card>
        <p className="text-body-md text-muted">Hết hạn hiện tại</p>
        <p className="text-headline-sm text-text">{currentEnd.toLocaleDateString('vi-VN')}</p>
      </Card>
      <TextField
        label="Số ngày gia hạn thêm"
        value={termDays}
        onChangeText={setTermDays}
        keyboardType="numeric"
        helperText="Phường sẽ xét duyệt và quyết định ngày hết hạn mới."
      />
    </Screen>
  );
}
