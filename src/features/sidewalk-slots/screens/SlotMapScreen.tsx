import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { VendorConnection } from '@/core/auth/VendorConnection';
import { sideApi, useVendorApiSession } from '@/core/api/side-api';
import { SlotMapView, type Bounds } from '../components/SlotMapView';
import { DEFAULT_CENTER, DEFAULT_SPAN } from '../map-constants';

export function SlotMapScreen() {
  return (
    <VendorConnection>
      <SlotMapContent />
    </VendorConnection>
  );
}

function SlotMapContent() {
  const generation = useVendorApiSession((s) => s.generation);
  const [bounds, setBounds] = useState<Bounds>({
    minLat: DEFAULT_CENTER[0] - DEFAULT_SPAN,
    maxLat: DEFAULT_CENTER[0] + DEFAULT_SPAN,
    minLng: DEFAULT_CENTER[1] - DEFAULT_SPAN,
    maxLng: DEFAULT_CENTER[1] + DEFAULT_SPAN,
  });

  const slots = useQuery({
    queryKey: ['side', generation, 'slots', bounds],
    queryFn: () => sideApi.searchSlots({ ...bounds, take: 200 }),
    placeholderData: (previous) => previous,
  });

  return (
    <SlotMapView
      slots={slots.data ?? []}
      onBoundsChange={setBounds}
      error={slots.error}
      onRetry={() => void slots.refetch()}
    />
  );
}
