import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { SegmentedControl } from '@/components/forms';
import { VendorConnection } from '@/core/auth/VendorConnection';
import { sideApi, useVendorApiSession } from '@/core/api/side-api';
import { SlotMapView, type Bounds } from '../components/SlotMapView';
import { StreetStripView } from '../components/StreetStripView';
import { DEFAULT_CENTER, DEFAULT_SPAN } from '../map-constants';

type View = 'MAP' | 'DIAGRAM';

export function SlotMapScreen() {
  return (
    <VendorConnection>
      <SlotMapContent />
    </VendorConnection>
  );
}

function SlotMapContent() {
  const generation = useVendorApiSession((s) => s.generation);
  const [view, setView] = useState<View>('MAP');
  const [bounds, setBounds] = useState<Bounds>({
    minLat: DEFAULT_CENTER[0] - DEFAULT_SPAN,
    maxLat: DEFAULT_CENTER[0] + DEFAULT_SPAN,
    minLng: DEFAULT_CENTER[1] - DEFAULT_SPAN,
    maxLng: DEFAULT_CENTER[1] + DEFAULT_SPAN,
  });

  // includeUnavailable: true so the "Tất cả" filter chip and the street-strip
  // diagram's zone picker both see rented/suspended slots too, not just
  // AVAILABLE ones -- previously the two map chips always returned the same
  // set because the server only ever sent AVAILABLE slots either way.
  const slots = useQuery({
    queryKey: ['side', generation, 'slots', { ...bounds, includeUnavailable: true }],
    queryFn: () => sideApi.searchSlots({ ...bounds, includeUnavailable: true, take: 200 }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="relative h-full min-h-0 w-full">
      {view === 'MAP' ? (
        <SlotMapView
          slots={slots.data ?? []}
          onBoundsChange={setBounds}
          error={slots.error}
          onRetry={() => void slots.refetch()}
        />
      ) : (
        <StreetStripView slots={slots.data ?? []} />
      )}

      <div className="pointer-events-auto absolute bottom-3 left-3 z-[1000] w-44 rounded-md border border-border bg-card p-1 shadow-md">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'MAP', label: 'Bản đồ' },
            { value: 'DIAGRAM', label: 'Sơ đồ tuyến' },
          ]}
        />
      </div>
    </div>
  );
}
