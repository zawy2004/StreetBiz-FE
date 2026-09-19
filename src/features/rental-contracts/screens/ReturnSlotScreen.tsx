import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
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
    onError: (error) => {
      setConfirm(false);
      showToast(error instanceof SideApiError ? error.message : 'Không trả được ô.');
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

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Trả ô này" variant="danger" onPress={() => setConfirm(true)} />
        </StickyActions>
      }
    >
      <AppHeader title="Trả ô vỉa hè" back subtitle={contract.data.slotCode} />
      <Card>
        <p className="text-body-md text-muted">
          Sau khi trả ô, giấy phép số sẽ hết hiệu lực và ô sẽ được mở lại cho các hộ kinh doanh
          khác. Vui lòng thanh toán mọi khoản phí còn nợ trước khi trả ô.
        </p>
      </Card>
      <TextField label="Lý do trả ô (không bắt buộc)" value={reason} onChangeText={setReason} multiline />
      <ConfirmDialog
        visible={confirm}
        title="Xác nhận trả ô?"
        description="Hành động này không thể hoàn tác."
        confirmLabel="Trả ô"
        confirmVariant="danger"
        onConfirm={() => cancel.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
