import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { VendorConnection } from '@/core/auth/VendorConnection';
import { sideApi, useVendorApiSession, SideApiError } from '@/core/api/side-api';

export function SlotDetailScreen() {
  return (
    <VendorConnection>
      <SlotDetailContent />
    </VendorConnection>
  );
}

function SlotDetailContent() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const generation = useVendorApiSession((s) => s.generation);
  const [applying, setApplying] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [requestedTermDays, setRequestedTermDays] = useState('90');

  const id = Number(slotId);
  const slot = useQuery({
    queryKey: ['side', generation, 'slot', id],
    queryFn: () => sideApi.getSlot(id),
    enabled: Number.isFinite(id),
  });

  const apply = useMutation({
    mutationFn: () =>
      sideApi.submitOpenSlotApplication({
        registrationId: Number(registrationId),
        slotId: id,
        requestedTermDays: Number(requestedTermDays),
      }),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', generation, 'applications'] });
      navigate('/vendor/slots/rental-applications');
    },
    onError: (error) => {
      showToast(error instanceof SideApiError ? error.message : 'Không gửi được đơn thuê.');
    },
  });

  if (slot.isPending) return <LoadingState />;
  if (slot.error)
    return (
      <ErrorState
        message={slot.error instanceof SideApiError ? slot.error.message : slot.error.message}
        onRetry={() => void slot.refetch()}
      />
    );
  const data = slot.data;

  return (
    <Screen
      footer={
        data.slotStatus === 'AVAILABLE' ? (
          <StickyActions>
            {applying ? (
              <div className="flex flex-col gap-sm">
                <label>
                  Mã hồ sơ đăng ký (registrationId)
                  <input
                    className="mt-xs w-full rounded-sm border border-border p-sm"
                    value={registrationId}
                    onChange={(e) => setRegistrationId(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Số ngày thuê
                  <input
                    className="mt-xs w-full rounded-sm border border-border p-sm"
                    value={requestedTermDays}
                    onChange={(e) => setRequestedTermDays(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <Button
                  label="Gửi đơn thuê ô này"
                  loading={apply.isPending}
                  disabled={!registrationId.trim() || !requestedTermDays.trim()}
                  onPress={() => apply.mutate()}
                />
              </div>
            ) : (
              <Button label="Nộp đơn thuê ô này" onPress={() => setApplying(true)} />
            )}
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={data.slotCode} back subtitle={data.zoneName} />
      <Card>
        <div className="flex justify-between">
          <Money amountVnd={data.pricePerDay} size="lg" />
          <StatusChip code={data.slotStatus} />
        </div>
        <p className="text-body-sm text-muted">mỗi ngày</p>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          <ListRow
            title="Kích thước"
            subtitle={
              data.widthMeters && data.lengthMeters
                ? `${data.widthMeters} × ${data.lengthMeters} m`
                : 'Chưa có dữ liệu'
            }
          />
          <Divider />
          <ListRow
            title="Khung giờ hoạt động"
            subtitle={
              data.availableFrom && data.availableTo
                ? `${data.availableFrom} – ${data.availableTo}`
                : 'Cả ngày'
            }
          />
          <Divider />
          <ListRow title="Toạ độ" subtitle={`${data.latitude}, ${data.longitude}`} />
          {data.distanceMeters != null && (
            <>
              <Divider />
              <ListRow title="Khoảng cách" subtitle={`${Math.round(data.distanceMeters)} m`} />
            </>
          )}
        </div>
      </Card>
    </Screen>
  );
}
