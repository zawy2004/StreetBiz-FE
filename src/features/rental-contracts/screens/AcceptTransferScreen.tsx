import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';

export function AcceptTransferScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const transferId = Number(id);
  const validId = Number.isFinite(transferId);

  // SIDE-13 has no GET-by-id -- the incoming list is the only place a
  // transfer's own data can be read from.
  const incoming = useQuery({
    queryKey: ['side', userId, 'transfers', 'incoming'],
    queryFn: () => sideApi.listTransfers('incoming'),
    enabled: validId,
  });
  const { registrations } = useRegistrations();

  const accept = useMutation({
    mutationFn: () => sideApi.acceptTransfer(transferId),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'transfers'] });
      navigate(-1);
    },
    onError: (error) => {
      showToast(error instanceof SideApiError ? error.message : 'Không chấp nhận được yêu cầu.');
    },
  });

  if (!validId) return <ErrorState message="Mã yêu cầu không hợp lệ." />;
  if (incoming.isPending) return <LoadingState />;
  if (incoming.error)
    return (
      <ErrorState
        message={incoming.error instanceof SideApiError ? incoming.error.message : incoming.error.message}
        onRetry={() => void incoming.refetch()}
      />
    );
  const transfer = incoming.data.find((t) => t.transferId === transferId);
  if (!transfer) return <ErrorState message="Không tìm thấy yêu cầu." />;

  const hasApprovedRegistration = registrations.some((r) => r.registrationStatus === 'APPROVED');

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Chấp nhận chuyển nhượng"
            disabled={!hasApprovedRegistration}
            loading={accept.isPending}
            onPress={() => accept.mutate()}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Chấp nhận chuyển nhượng" back />
      <Card>
        <p className="text-body-md text-text">
          Một hộ kinh doanh muốn chuyển nhượng ô đang thuê cho bạn. Yêu cầu cần Phường duyệt trước
          khi có hiệu lực.
        </p>
      </Card>
      {!hasApprovedRegistration ? (
        <Card style={{ backgroundColor: '#E09F3E18', borderColor: '#E09F3E40' }}>
          <p className="text-body-md text-on-secondary">
            Bạn cần có hồ sơ đăng ký kinh doanh đã được duyệt trước khi nhận chuyển nhượng.
          </p>
        </Card>
      ) : null}
    </Screen>
  );
}
