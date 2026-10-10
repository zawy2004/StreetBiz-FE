import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { sideApi, type SidewalkZone } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { SlotDetailPanel } from '../components/SlotDetailPanel';
import { deadlineText } from '../slot-format';
import { useNow } from '../useNow';
import { useWorkspaceStore } from '../workspace-store';

/**
 * One slot as a page of its own (deep links, the assistant): the bay drawn to
 * scale beside a sticky price card, under the street sign of its route.
 */
export function SlotDetailScreen() {
  const { slotId } = useParams<{ slotId: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const focusSlot = useWorkspaceStore((s) => s.focusSlot);

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

  if (!validId) {
    return (
      <Screen>
        <ErrorState message="Mã ô không hợp lệ." />
        <div className="flex justify-center">
          <Button
            label="Mở sơ đồ ô"
            variant="outline"
            fullWidth={false}
            icon={<Icon name="map-outline" size={18} color="currentColor" />}
            onPress={() => navigate('/vendor/slots')}
          />
        </div>
      </Screen>
    );
  }
  if (slot.isPending) return <SlotPageSkeleton />;
  if (slot.error)
    return (
      <Screen>
        <ErrorState message={slot.error.message} onRetry={() => void slot.refetch()} />
      </Screen>
    );

  // Same hand-off as the hold basket: pick the slot in the workspace, then open it.
  const openOnPlan = () => {
    focusSlot(slot.data.zoneId, slot.data.slotId);
    navigate('/vendor/slots');
  };

  return (
    <Screen>
      <AppHeader
        title={slot.data.slotCode}
        back
        subtitle={slot.data.zoneName}
        right={
          <button
            type="button"
            onClick={openOnPlan}
            aria-label="Xem trên sơ đồ tuyến"
            className="inline-flex h-12 items-center gap-1.5 rounded-[12px] px-sm text-[15px] font-semibold text-primary transition-[background-color,transform] hover:bg-tint-primary active:scale-[0.98] md:px-md"
          >
            <Icon name="map-outline" size={22} color="currentColor" weight="duotone" />
            <span className="hidden sm:inline">Xem trên sơ đồ tuyến</span>
          </button>
        }
      />
      {zone.data ? <ZoneSegmentSign zone={zone.data} /> : null}
      <SlotDetailPanel slot={slot.data} zone={zone.data} variant="page" />
    </Screen>
  );
}

/** The route as a white street sign: name, segment, legal basis, deadline, and a painted kerb at its foot. */
function ZoneSegmentSign({ zone }: { zone: SidewalkZone }) {
  const nowMs = useNow(60_000);
  const deadline = zone.applicationDeadline ? deadlineText(zone.applicationDeadline, nowMs) : null;
  return (
    <div className="overflow-hidden rounded-[18px] bg-card shadow-card ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-x-md gap-y-xs px-md py-sm">
        <p className="min-w-0 break-words font-sign text-[22px] font-extrabold leading-tight text-text [font-stretch:86%] md:text-[24px]">
          {zone.zoneName}
        </p>
        <div className="flex flex-wrap items-center gap-xs">
          {zone.zoneCode ? (
            <span className="inline-flex h-7 items-center rounded-full px-sm font-sign text-label font-bold tracking-[0.04em] text-text ring-1 ring-inset ring-text/20">
              {zone.zoneCode}
            </span>
          ) : null}
          {zone.segmentFrom && zone.segmentTo ? (
            <span className="inline-flex h-7 items-center gap-1 rounded-full px-sm text-label text-muted ring-1 ring-inset ring-border">
              <Icon name="map-marker-outline" size={14} color="currentColor" />
              {zone.segmentFrom} ⇄ {zone.segmentTo}
            </span>
          ) : null}
          {zone.regulationRef ? (
            <span className="inline-flex h-7 items-center gap-1 rounded-full bg-tint-indigo px-sm text-label text-indigo ring-1 ring-inset ring-indigo/25">
              <Icon name="gavel" size={14} color="currentColor" />
              {zone.regulationRef}
            </span>
          ) : null}
          {deadline ? (
            <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#FFF3D1] px-sm text-label font-semibold text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
              <Icon name="timer-outline" size={14} color="currentColor" />
              {deadline}
            </span>
          ) : null}
        </div>
      </div>
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
    </div>
  );
}

/** Loading: the title, the sign, the 4:3 drawing and the price card in their places. */
function SlotPageSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải ô" className="flex flex-col gap-md">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-14 w-full rounded-[18px]" />
        <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,1fr)_392px] xl:gap-xl">
          <Skeleton className="aspect-[4/3] w-full rounded-[20px]" />
          <Skeleton className="h-[420px] w-full rounded-[24px]" />
        </div>
      </div>
    </Screen>
  );
}
