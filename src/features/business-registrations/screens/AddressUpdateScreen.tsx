import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { useRegistrationDetail } from '../useRegistrations';

export function AddressUpdateScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const registrationId = Number(id);
  const validId = Number.isFinite(registrationId);
  const { registration, isLoading, isError, error, refetch } = useRegistrationDetail(registrationId);
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState<string>();

  const submit = useMutation({
    mutationFn: () => sideApi.requestAddressChange({ registrationId, newAddress: address.trim() }),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'address-changes'] });
      navigate(-1);
    },
    onError: (err) => setFormError(err instanceof SideApiError ? err.message : 'Không gửi được yêu cầu.'),
  });

  if (!validId) return <ErrorState message="Mã hồ sơ không hợp lệ." />;
  if (isLoading) return <LoadingState />;
  if (isError || !registration)
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={refetch} />;

  const handleSubmit = () => {
    if (!address.trim()) return setFormError('Vui lòng nhập địa chỉ mới.');
    setFormError(undefined);
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
      <AppHeader title="Đổi địa chỉ kinh doanh" back subtitle={registration.displayName} />
      <Card>
        <p className="text-body-md text-muted">
          Phường sẽ kiểm tra ô liền kề tại địa chỉ mới. Ô hiện tại được giữ trong thời gian ân hạn
          nếu còn phí chưa thanh toán.
        </p>
      </Card>
      <TextField
        label="Địa chỉ kinh doanh mới"
        value={address}
        onChangeText={setAddress}
        placeholder="Số nhà, đường, phường"
        error={formError}
      />
    </Screen>
  );
}
