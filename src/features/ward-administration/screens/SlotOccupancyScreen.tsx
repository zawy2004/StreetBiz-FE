import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { statusTones, type StatusTone } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { wardConfigApi } from '../ward-config-api';

type OccupancyRow = { key: string | number; code: string; place: string; status: string };

// Live slots are ACTIVE when rented; mock slots say RENTED.
function toneOf(status: string): StatusTone {
  if (status === 'AVAILABLE') return 'ok';
  if (status === 'ACTIVE' || status === 'RENTED') return 'neutral';
  if (status === 'SUSPENDED') return 'danger';
  return 'pending';
}

export function SlotOccupancyScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  // Same key as SlotGridEditorScreen's unfiltered grid, so "Cấu hình" opens warm.
  const grid = useQuery({
    queryKey: ['ward', userId, 'slot-grid', null],
    queryFn: () => wardConfigApi.slotGrid(),
    enabled: isLiveApi,
  });
  const mockSlots = useMockDb((s) => s.slots);

  const rows: OccupancyRow[] = isLiveApi
    ? (grid.data?.slots ?? []).map((slot) => ({
        key: slot.slotId,
        code: slot.slotCode,
        place: slot.zoneName,
        status: slot.status,
      }))
    : mockSlots
        .filter((s) => s.proposal_review_status !== 'PENDING')
        .map((slot) => ({
          key: slot.id,
          code: slot.slot_code,
          place: slot.street,
          status: slot.slot_status,
        }));

  return (
    <Screen>
      <AppHeader
        title="Lưới ô vỉa hè"
        right={
          <Button
            label="Cấu hình"
            variant="outline"
            fullWidth={false}
            onPress={() => navigate('/ward/slots/editor')}
          />
        }
      />
      {isLiveApi && grid.isLoading ? (
        <LoadingState />
      ) : isLiveApi && grid.isError ? (
        <ErrorState message={errorMessage(grid.error)} onRetry={() => void grid.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="map-marker-radius-outline" title="Chưa có ô vỉa hè nào" />
      ) : (
        rows.map((row) => {
          const tone = statusTones[toneOf(row.status)];
          return (
            <Card key={row.key} style={{ padding: 0, overflow: 'hidden' }}>
              <div className="flex flex-row">
                <div className="w-1.5" style={{ backgroundColor: tone.fg }} />
                <div className="flex flex-1 flex-row items-center justify-between p-md">
                  <div>
                    <p className="text-headline-sm text-text">{row.code}</p>
                    <p className="text-body-sm text-muted">{row.place}</p>
                  </div>
                  <StatusChip code={row.status} />
                </div>
              </div>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
