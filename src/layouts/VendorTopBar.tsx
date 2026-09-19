import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';

import { Avatar, Icon } from '@/components/common';
import { sideApi, type SidewalkSlot, type SlotHold } from '@/core/api/side-api';
import { formatCountdown, hkdCode, secondsUntil } from '@/features/sidewalk-slots/slot-format';
import { slotMatchesSearch } from '@/features/sidewalk-slots/slot-stats';
import { useHolds } from '@/features/sidewalk-slots/useHolds';
import { useNow } from '@/features/sidewalk-slots/useNow';
import { useWorkspaceStore } from '@/features/sidewalk-slots/workspace-store';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';

const WORKSPACE_PATH = '/vendor/slots';
const MAX_SEARCH_RESULTS = 8;

/**
 * Top bar for the Hộ kinh doanh role only. Route select, search and the
 * amenity-layer toggle appear while the slot workspace is mounted (it
 * registers its zones and slots in the workspace store); the hold basket,
 * notifications and the user block are always there.
 */
export function VendorTopBar() {
  const isDesktop = useIsDesktop();
  const user = useAuthStore((s) => s.user);
  const { registration } = useHolds();
  const zones = useWorkspaceStore((s) => s.zones);
  const onWorkspace = zones.length > 0;

  return (
    <header className="flex shrink-0 flex-col border-b border-border bg-card">
      <div className="flex h-16 items-center gap-sm px-md">
        {onWorkspace && <RouteSelect />}
        {onWorkspace && isDesktop && <SlotSearch />}
        <div className="ml-auto flex items-center gap-xs">
          {onWorkspace && <LayersToggle />}
          <HoldBasket />
          <Link
            to="/account/notifications"
            aria-label="Thông báo"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-bg"
          >
            <Icon name="bell-outline" size={22} color={colors.text} />
          </Link>
          <div className="ml-xs flex items-center gap-xs">
            {isDesktop && (
              <div className="text-right">
                <p className="max-w-[180px] truncate text-label text-text">{user?.fullName ?? 'Hộ kinh doanh'}</p>
                {registration && (
                  <p className="text-body-sm text-muted">{hkdCode(registration.registrationId)}</p>
                )}
              </div>
            )}
            <Avatar name={user?.fullName ?? '?'} size={36} />
          </div>
        </div>
      </div>
      {onWorkspace && !isDesktop && (
        <div className="border-t border-border px-md py-xs">
          <SlotSearch />
        </div>
      )}
    </header>
  );
}

function RouteSelect() {
  const zones = useWorkspaceStore((s) => s.zones);
  const zoneId = useWorkspaceStore((s) => s.zoneId);
  const selectZone = useWorkspaceStore((s) => s.selectZone);

  return (
    <label className="flex h-10 min-w-0 max-w-[280px] items-center gap-xs rounded-full border border-border bg-bg px-sm text-label text-text">
      <Icon name="map-marker-outline" size={18} color={colors.muted} />
      <span className="sr-only">Tuyến</span>
      <select
        aria-label="Tuyến"
        value={zoneId ?? ''}
        onChange={(e) => selectZone(Number(e.target.value))}
        className="min-w-0 flex-1 cursor-pointer truncate bg-transparent outline-none"
      >
        {zones.map((z) => (
          <option key={z.zoneId} value={z.zoneId}>
            {z.zoneName}
          </option>
        ))}
      </select>
    </label>
  );
}

function SlotSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchIndex = useWorkspaceStore((s) => s.searchIndex);
  const focusSlot = useWorkspaceStore((s) => s.focusSlot);
  const [query, setQuery] = useState('');

  const matches = query.trim()
    ? searchIndex.filter((s) => slotMatchesSearch(s, query)).slice(0, MAX_SEARCH_RESULTS)
    : [];

  return (
    <div className="relative min-w-0 flex-1 md:max-w-md">
      <div className="flex h-10 items-center gap-xs rounded-full border border-border bg-bg px-sm">
        <Icon name="magnify" size={18} color={colors.muted} />
        <input
          className="min-w-0 flex-1 bg-transparent text-body-sm text-text outline-none"
          placeholder="Tìm ô số, tuyến đường…"
          aria-label="Tìm ô"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim() !== '' && (
        <ul className="absolute inset-x-0 top-11 z-50 max-h-64 overflow-y-auto rounded-md border border-border bg-card shadow-sheet">
          {matches.length === 0 ? (
            <li className="px-sm py-xs text-body-sm text-muted">Không tìm thấy ô nào.</li>
          ) : (
            matches.map((s) => (
              <li key={s.slotId}>
                <button
                  type="button"
                  className="flex w-full flex-col px-sm py-xs text-left hover:bg-bg"
                  onClick={() => {
                    focusSlot(s.zoneId, s.slotId);
                    if (location.pathname !== WORKSPACE_PATH) navigate(WORKSPACE_PATH);
                    setQuery('');
                  }}
                >
                  <span className="text-body-sm font-semibold text-text">{s.slotCode}</span>
                  <span className="text-body-sm text-muted">{s.zoneName}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function LayersToggle() {
  const showFeatures = useWorkspaceStore((s) => s.showFeatures);
  const toggle = useWorkspaceStore((s) => s.toggleFeatures);
  return (
    <button
      type="button"
      aria-label="Lớp tiện ích và hành lang kỹ thuật"
      aria-pressed={showFeatures}
      title="Hiện/ẩn hành lang kỹ thuật và tiện ích"
      onClick={toggle}
      className={[
        'flex h-10 w-10 items-center justify-center rounded-full',
        showFeatures ? 'bg-tint-indigo' : 'hover:bg-bg',
      ].join(' ')}
    >
      <Icon name="layers-outline" size={22} color={showFeatures ? colors.indigo : colors.muted} />
    </button>
  );
}

function HoldBasket() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = useAuthStore((s) => s.user?.id);
  const nowMs = useNow();
  const focusSlot = useWorkspaceStore((s) => s.focusSlot);
  const { holds, release } = useHolds();
  const [open, setOpen] = useState(false);

  // Holds carry only ids; the slot code and zone come from the slot itself
  // (same cache key as the detail screen, so an open detail shares the fetch).
  const slots = useQueries({
    queries: holds.map((h) => ({
      queryKey: ['side', userId, 'slot', h.slotId],
      queryFn: () => sideApi.getSlot(h.slotId),
    })),
  });
  const slotById = new Map<number, SidewalkSlot>();
  slots.forEach((q) => {
    if (q.data) slotById.set(q.data.slotId, q.data);
  });

  const openHold = (hold: SlotHold) => {
    const slot = slotById.get(hold.slotId);
    if (!slot) return;
    focusSlot(slot.zoneId, slot.slotId);
    if (location.pathname !== WORKSPACE_PATH) navigate(WORKSPACE_PATH);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Giỏ giữ chỗ (${holds.length})`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-bg"
      >
        <Icon name="bookmark-outline" size={22} color={colors.text} />
        {holds.length > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-badge text-white">
            {holds.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng giỏ giữ chỗ"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 max-w-[90vw] rounded-md border border-border bg-card p-sm shadow-sheet">
            <p className="mb-xs text-headline-sm text-text">Giỏ giữ chỗ</p>
            {holds.length === 0 ? (
              <p className="text-body-sm text-muted">Bạn chưa giữ chỗ ô nào.</p>
            ) : (
              <ul className="flex flex-col gap-xs">
                {holds.map((hold) => {
                  const slot = slotById.get(hold.slotId);
                  return (
                    <li key={hold.slotId} className="flex items-center justify-between gap-xs rounded-md bg-bg p-xs">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-text">
                          {slot?.slotCode ?? `Ô #${hold.slotId}`}
                        </p>
                        <p className="truncate text-body-sm text-muted">
                          Còn {formatCountdown(secondsUntil(hold.expiresAt, nowMs))}
                          {slot ? ` · ${slot.zoneName}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={!slot}
                          className="rounded-sm border border-border bg-card px-xs py-1 text-label text-indigo disabled:opacity-50"
                          onClick={() => openHold(hold)}
                        >
                          Nộp hồ sơ
                        </button>
                        <button
                          type="button"
                          className="rounded-sm border border-border bg-card px-xs py-1 text-label text-primary"
                          onClick={() => release.mutate(hold.slotId)}
                        >
                          Nhả
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
