import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import { isLiveContract } from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';

export function ReturnSlotScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const cancel = useMutation({
    mutationFn: () => sideApi.cancelContract(contractId, reason.trim() || null),
    onSuccess: (result) => {
      setConfirm(false);
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'contracts'] });
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'contract', contractId] });
      navigate('/vendor/slots/contracts', { replace: true });
    },
    onError: (err) => {
      setConfirm(false);
      setError(err instanceof SideApiError ? err.message : 'Không trả được ô.');
    },
  });

  if (!validId) return <ErrorState message="Mã hợp đồng không hợp lệ." />;
  if (contract.isPending) return <LoadingState />;
  if (contract.error) return <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />;

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="mx-auto w-full max-w-xl">
            <Button label="Trả ô này" variant="danger" onPress={() => setConfirm(true)} />
          </div>
        </StickyActions>
      }
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-md">
        <AppHeader title="Trả ô vỉa hè" back subtitle="Kết thúc hợp đồng thuê trước hạn" />

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Ô sẽ trả</p>
            <ContractSummary contract={contract.data} live={isLiveContract(contract.data.contractStatus)} />
          </div>
        </Card>

        <Callout tone="danger">
          <p className="font-semibold">Trước khi trả ô, bạn cần biết:</p>
          <ul className="mt-1 list-disc pl-md">
            <li>Giấy phép số của ô này sẽ hết hiệu lực.</li>
            <li>Ô được mở lại cho các hộ kinh doanh khác.</li>
            <li>Hãy thanh toán mọi khoản phí còn nợ trước khi trả ô.</li>
          </ul>
        </Callout>

        <Card>
          <TextField
            label="Lý do trả ô (không bắt buộc)"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="VD: Chuyển địa điểm kinh doanh"
          />
        </Card>

        {error && <Callout tone="danger">{error}</Callout>}
      </div>

      <ConfirmDialog
        visible={confirm}
        title="Xác nhận trả ô?"
        description="Hành động này không thể hoàn tác."
        confirmLabel="Trả ô"
        confirmVariant="danger"
        onConfirm={() => {
          setError(undefined);
          cancel.mutate();
        }}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
