import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { VENDOR_TYPE } from '@/core/api';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import {
  AddressPlates,
  CautionNote,
  NextStepsAfterAddress,
  RegistrationStrip,
} from '../components/lifecycle/LifecycleParts';
import { useRegistrationDetail } from '../useRegistrations';

const NETWORK_ERROR = 'Không kết nối được Backend. Kiểm tra URL API, HTTPS và CORS rồi thử lại.';

/**
 * SIDE-09/10: tell the ward the storefront has moved. "From here to there" as
 * two address plates, what happens after sending, and which file it is for.
 */
export function AddressUpdateScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const registrationId = Number(id);
  const validId = Number.isFinite(registrationId);
  const { registration, isLoading, isError, error, refetch } =
    useRegistrationDetail(registrationId);
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState<string>();

  const submit = useMutation({
    mutationFn: () => sideApi.requestAddressChange({ registrationId, newAddress: address.trim() }),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'address-changes'] });
      navigate(-1);
    },
    onError: (err) =>
      setFormError(err instanceof SideApiError ? err.message : 'Không gửi được yêu cầu.'),
  });

  // Every state keeps the title and the way back, so an old link never strands anyone.
  const frame = (body: ReactNode, subtitle?: string) => (
    <Screen width="narrow">
      <AppHeader title="Đổi địa chỉ kinh doanh" back subtitle={subtitle} />
      {body}
    </Screen>
  );

  if (!validId) return frame(<ErrorState message="Mã hồ sơ không hợp lệ." />);
  if (isLoading)
    return frame(
      <div role="status" aria-label="Đang tải…" className="flex flex-col gap-md">
        <Skeleton className="h-[64px] w-full rounded-[18px]" />
        <div className="grid gap-sm md:grid-cols-[1fr_88px_1fr]">
          <Skeleton className="h-[96px] w-full rounded-[10px]" />
          <span />
          <Skeleton className="h-[96px] w-full rounded-[10px]" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>,
    );
  if (isError || !registration)
    return frame(
      <div className="rounded-[24px] border-2 border-dashed border-error/40 bg-card">
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={refetch}
        />
      </div>,
    );

  const handleSubmit = () => {
    if (!address.trim()) return setFormError('Vui lòng nhập địa chỉ mới.');
    setFormError(undefined);
    submit.mutate();
  };

  const eligible =
    registration.vendorType === VENDOR_TYPE.fixedStorefront &&
    registration.registrationStatus === 'APPROVED';

  return (
    <Screen
      width="narrow"
      footer={
        <StickyActions>
          <Button label="Gửi yêu cầu" loading={submit.isPending} onPress={handleSubmit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đổi địa chỉ kinh doanh" back subtitle={registration.displayName} />
      <RegistrationStrip registration={registration} />
      {!eligible ? (
        <CautionNote>
          Đổi địa chỉ dành cho cửa hàng cố định đã được duyệt. Phường có thể không nhận yêu cầu cho
          hồ sơ này.
        </CautionNote>
      ) : null}

      <AddressPlates current={registration.declaredAddress} next={address} invalid={!!formError} />

      <div className="cq flex max-w-[600px] flex-col gap-xs">
        <TextField
          label="Địa chỉ kinh doanh mới"
          value={address}
          onChangeText={setAddress}
          placeholder="Số nhà, đường, phường"
          error={formError}
        />
        {formError === NETWORK_ERROR ? (
          <p className="text-body-sm font-medium text-muted">
            Kiểm tra kết nối rồi bấm Gửi yêu cầu lần nữa.
          </p>
        ) : null}
      </div>

      <NextStepsAfterAddress />
    </Screen>
  );
}
