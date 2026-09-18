import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { SegmentedControl } from '@/components/forms';
import { colors } from '@/theme';
import { sideApi } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { SlotMapView, type Bounds } from '../components/SlotMapView';
import { StreetStripView } from '../components/StreetStripView';
import { DEFAULT_CENTER, DEFAULT_SPAN } from '../map-constants';

type View = 'MAP' | 'DIAGRAM';

// The bottom tab bar only links here ("Ô thuê"); nothing links onward to the
// applications/contracts/transfers lists (SlotDetailScreen's apply flow does
// navigate to rental-applications once, but that's a one-way redirect, not a
// way back). A row of visible buttons in a fixed header reads more reliably
// than an icon tucked into a corner of the map.
const MENU_ITEMS = [
  { icon: 'format-list-bulleted', label: 'Đơn thuê ô', to: '/vendor/slots/rental-applications' },
  { icon: 'file-document-outline', label: 'Hợp đồng thuê ô', to: '/vendor/slots/contracts' },
  { icon: 'swap-horizontal', label: 'Chuyển nhượng ô', to: '/vendor/slots/transfers' },
  { icon: 'map-marker-outline', label: 'Đề xuất ô mới', to: '/vendor/slots/slot-proposals/new' },
] as const;

export function SlotMapScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
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
    queryKey: ['side', userId, 'slots', { ...bounds, includeUnavailable: true }],
    queryFn: () => sideApi.searchSlots({ ...bounds, includeUnavailable: true, take: 200 }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-xs border-b border-border bg-card p-sm">
        <div className="w-44">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'MAP', label: 'Bản đồ' },
              { value: 'DIAGRAM', label: 'Sơ đồ tuyến' },
            ]}
          />
        </div>
        <div className="flex gap-xs overflow-x-auto">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-bg px-sm text-label text-text transition-opacity active:opacity-80"
            >
              <Icon name={item.icon} size={16} color={colors.muted} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
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
      </div>
    </div>
  );
}
