import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/common';
import { PhoneField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

export function TransferInitiateScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const submit = useMutation({
    mutationFn: () => sideApi.requestTransfer({ contractId, toVendorPhone: phone }),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'transfers'] });
      navigate(-1);
    },
    onError: (err) => setError(err instanceof SideApiError ? err.message : 'Không gửi được yêu cầu.'),
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

  const handleSubmit = () => {
    if (phone.replace(/\D/g, '').length < 9) return setError('Số điện thoại chưa hợp lệ.');
    setError(undefined);
    submit.mutate();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi yêu cầu" loading={submit.isPending} onPress={handleSubmit} />
        </StickyActions>
      }
    >
      <AppHeader
        title="Chuyển nhượng ô"
        back
        subtitle={`${contract.data.slotCode} · Nhập số điện thoại hộ kinh doanh nhận chuyển nhượng`}
      />
      <PhoneField value={phone} onChangeText={setPhone} error={error} />
    </Screen>
  );
}
