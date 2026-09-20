import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { PhoneField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import { isLiveContract } from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';

export function TransferInitiateScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
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
  if (contract.error) return <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />;

  const handleSubmit = () => {
    setError(undefined);
    if (phone.replace(/\D/g, '').length < 9) return setPhoneError('Số điện thoại chưa hợp lệ.');
    setPhoneError(undefined);
    submit.mutate();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="mx-auto w-full max-w-xl">
            <Button label="Gửi yêu cầu" loading={submit.isPending} onPress={handleSubmit} />
          </div>
        </StickyActions>
      }
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-md">
        <AppHeader title="Chuyển nhượng ô" back subtitle="Chuyển ô đang thuê cho hộ kinh doanh khác" />

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Ô chuyển nhượng</p>
            <ContractSummary contract={contract.data} live={isLiveContract(contract.data.contractStatus)} />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Hộ kinh doanh nhận ô</p>
            <PhoneField label="Số điện thoại người nhận" value={phone} onChangeText={setPhone} error={phoneError} />
            <p className="text-body-sm text-muted">
              Người nhận cần có tài khoản Hộ kinh doanh và hồ sơ đăng ký đã được duyệt.
            </p>
          </div>
        </Card>

        <Callout tone="neutral">
          Người nhận phải đồng ý, sau đó Phường duyệt thì việc chuyển nhượng mới có hiệu lực. Trong lúc chờ, ô vẫn thuộc
          về bạn.
        </Callout>
        {error && <Callout tone="danger">{error}</Callout>}
      </div>
    </Screen>
  );
}
