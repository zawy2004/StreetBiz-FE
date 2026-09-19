import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { AppHeader, Screen } from '@/components/layout';
import { ErrorState, LoadingState } from '@/components/feedback';
import { sideApi } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { SlotDetailPanel } from '../components/SlotDetailPanel';

/** The same panel the workspace shows beside the plan, as a page of its own (deep link / back-navigable). */
export function SlotDetailScreen() {
  const { slotId } = useParams<{ slotId: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const id = Number(slotId);
  const validId = Number.isFinite(id);
  const slot = useQuery({
    queryKey: ['side', userId, 'slot', id],
    queryFn: () => sideApi.getSlot(id),
    enabled: validId,
  });
  const zone = useQuery({
    queryKey: ['side', userId, 'zone', slot.data?.zoneId],
    queryFn: () => sideApi.getZone(slot.data!.zoneId),
    enabled: !!slot.data,
  });

  if (!validId) return <ErrorState message="Mã ô không hợp lệ." />;
  if (slot.isPending) return <LoadingState />;
  if (slot.error) return <ErrorState message={slot.error.message} onRetry={() => void slot.refetch()} />;

  return (
    <Screen>
      <AppHeader title={slot.data.slotCode} back subtitle={slot.data.zoneName} />
      <div className="mx-auto w-full max-w-xl">
        <SlotDetailPanel slot={slot.data} zone={zone.data} />
      </div>
    </Screen>
  );
}
