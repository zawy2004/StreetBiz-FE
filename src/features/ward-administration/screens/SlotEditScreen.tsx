import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { WardGate } from '../components/WardGate';
import { GridError, GridLoading } from '../components/ops/grid/GridStates';
import { SlotPanel } from '../components/ops/grid/SlotPanel';
import { SlotSwitcher } from '../components/ops/grid/SlotSwitcher';
import { errorMessage, wardConfigApi } from '../ward-config-api';

/**
 * One slot on its own page, opened from the occupancy board: only that slot's form
 * (size, facilities, photos, status), no map. Another slot can be picked from the list.
 */
export function SlotEditScreen() {
  return (
    <WardGate>
      <SlotEditContent />
    </WardGate>
  );
}

function SlotEditContent() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const zones = useQuery({ queryKey: ['ward', userId, 'zones'], queryFn: wardConfigApi.listZones });
  // Same key as the occupancy board's grid, so the page opens warm.
  const grid = useQuery({
    queryKey: ['ward', userId, 'slot-grid', null],
    queryFn: () => wardConfigApi.slotGrid(),
  });

  if (zones.isPending || grid.isPending) return <GridLoading />;
  if (zones.error || grid.error)
    return (
      <GridError
        message={errorMessage(zones.error ?? grid.error)}
        onRetry={() => {
          void zones.refetch();
          void grid.refetch();
        }}
      />
    );

  const backToBoard = () => navigate('/ward/slots');
  const slots = grid.data.slots;
  const slot = slots.find((s) => String(s.slotId) === slotId);

  if (!slot) {
    return (
      <Screen width="narrow">
        <AppHeader title="Sửa ô" back />
        <EmptyState
          icon="map-marker-radius-outline"
          title="Không tìm thấy ô này"
          description="Ô có thể đã bị xóa. Quay lại lưới ô để chọn ô khác."
        />
        <Button label="Về lưới ô" variant="outline" fullWidth={false} onPress={backToBoard} />
      </Screen>
    );
  }

  return (
    <Screen width="narrow">
      <AppHeader title="Sửa ô" back />
      <SlotSwitcher
        slots={slots}
        current={slot}
        onPick={(s) => navigate(`/ward/slots/${s.slotId}`)}
      />
      <SlotPanel
        key={`${slot.slotId}-${slot.versionToken}`}
        slot={slot}
        zones={zones.data}
        newPosition={null}
        standalone
        onClose={backToBoard}
        onChanged={() => void client.invalidateQueries({ queryKey: ['ward', userId] })}
      />
    </Screen>
  );
}
