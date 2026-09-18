import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Icon, IconButton, ListRow } from '@/components/common';
import { SegmentedControl } from '@/components/forms';
import { BottomSheet } from '@/components/layout';
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
// way back). This sheet is that missing way in.
const MENU_ITEMS = [
  { icon: 'format-list-bulleted', title: 'Đơn thuê ô', to: '/vendor/slots/rental-applications' },
  { icon: 'file-document-outline', title: 'Hợp đồng thuê ô', to: '/vendor/slots/contracts' },
  { icon: 'swap-horizontal', title: 'Chuyển nhượng ô', to: '/vendor/slots/transfers' },
  { icon: 'map-marker-outline', title: 'Đề xuất ô mới', to: '/vendor/slots/slot-proposals/new' },
] as const;

export function SlotMapScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [view, setView] = useState<View>('MAP');
  const [menuOpen, setMenuOpen] = useState(false);
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

      <div className="pointer-events-auto absolute bottom-3 left-3 z-[1000] flex items-center gap-xs">
        <div className="w-44 rounded-md border border-border bg-card p-1 shadow-md">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'MAP', label: 'Bản đồ' },
              { value: 'DIAGRAM', label: 'Sơ đồ tuyến' },
            ]}
          />
        </div>
        <div className="rounded-full bg-card shadow-md">
          <IconButton
            icon="format-list-bulleted"
            accessibilityLabel="Đơn thuê, hợp đồng và chuyển nhượng của tôi"
            onPress={() => setMenuOpen(true)}
          />
        </div>
      </div>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        {MENU_ITEMS.map((item) => (
          <ListRow
            key={item.to}
            title={item.title}
            leading={<Icon name={item.icon} size={22} color={colors.muted} />}
            showChevron
            onPress={() => {
              setMenuOpen(false);
              navigate(item.to);
            }}
          />
        ))}
      </BottomSheet>
    </div>
  );
}
