import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';

import { Avatar, Icon } from '@/components/common';
import { sideApi, type SidewalkSlot, type SlotHold } from '@/core/api/side-api';
import { useNotificationUnreadCount } from '@/features/account-management/notifications-api';
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
    <header className="flex shrink-0 flex-col border-b border-border bg-card/95 backdrop-blur">
      <div className="flex h-16 items-center gap-sm px-md lg:px-lg">
        {onWorkspace && <RouteSelect />}
        {onWorkspace && isDesktop && <SlotSearch />}
        <div className="ml-auto flex items-center gap-xs">
          {onWorkspace && <LayersToggle />}
          <HoldBasket />
          <NotificationBell />
          <div className="ml-xs flex items-center gap-xs border-l border-border pl-sm">
            {isDesktop && (
              <div className="text-right">
                <p
                  title={user?.fullName ?? 'Hộ kinh doanh'}
                  className="max-w-[180px] truncate text-label font-semibold text-text"
                >
                  {user?.fullName ?? 'Hộ kinh doanh'}
                </p>
                {registration && (
                  <p className="mt-0.5 font-sign text-[13px] font-bold tracking-[0.02em] text-primary-pressed [font-stretch:88%]">
                    {hkdCode(registration.registrationId)}
                  </p>
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

function NotificationBell() {
  const unread = useNotificationUnreadCount();

  return (
    <Link
      to="/account/notifications"
      aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
      className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card ring-1 ring-border transition-colors hover:bg-sunken lg:h-11 lg:w-11"
    >
      <Icon
        name="bell-outline"
        size={22}
        color={colors.text}
        weight={unread > 0 ? 'fill' : 'regular'}
      />
      {unread > 0 && (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-card bg-brand">
          <span className="sb-ping absolute inset-0 rounded-full bg-brand" />
        </span>
      )}
    </Link>
  );
}

function RouteSelect() {
  const zones = useWorkspaceStore((s) => s.zones);
  const zoneId = useWorkspaceStore((s) => s.zoneId);
  const selectZone = useWorkspaceStore((s) => s.selectZone);

  return (
    <label className="flex h-11 min-w-0 max-w-[280px] items-center gap-xs rounded-full bg-card px-sm text-label font-semibold text-text shadow-card ring-1 ring-border transition-colors hover:ring-text/25">
      <Icon name="map-marker" size={18} color={colors.primary} weight="fill" />
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
      <div className="flex h-11 items-center gap-xs rounded-full bg-sunken px-sm ring-1 ring-transparent transition-shadow focus-within:bg-card focus-within:ring-primary/50">
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
        <ul className="sb-pop absolute inset-x-0 top-12 z-50 max-h-64 overflow-y-auto rounded-[16px] bg-card p-1 shadow-sheet ring-1 ring-border">
          {matches.length === 0 ? (
            <li className="px-sm py-sm text-body-sm text-muted">Không tìm thấy ô nào.</li>
          ) : (
            matches.map((s) => (
              <li key={s.slotId}>
                <button
                  type="button"
                  className="flex w-full items-center gap-sm rounded-[12px] px-sm py-xs text-left transition-colors hover:bg-tint-primary"
                  onClick={() => {
                    focusSlot(s.zoneId, s.slotId);
                    if (location.pathname !== WORKSPACE_PATH) navigate(WORKSPACE_PATH);
                    setQuery('');
                  }}
                >
                  <span className="kerb-tag">{s.slotCode}</span>
                  <span className="min-w-0 truncate text-body-sm text-muted">{s.zoneName}</span>
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
        'flex h-12 w-12 items-center justify-center rounded-full ring-1 transition-colors lg:h-11 lg:w-11',
        showFeatures ? 'bg-tint-primary ring-primary/40' : 'bg-card ring-border hover:bg-sunken',
      ].join(' ')}
    >
      <Icon
        name="layers-outline"
        size={22}
        color={showFeatures ? colors.primaryPressed : colors.muted}
        weight={showFeatures ? 'fill' : 'regular'}
      />
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
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card ring-1 ring-border transition-colors hover:bg-sunken lg:h-11 lg:w-11"
      >
        <Icon
          name="bookmark-outline"
          size={22}
          color={colors.text}
          weight={holds.length > 0 ? 'fill' : 'regular'}
        />
        {holds.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-badge font-tabular text-on-accent ring-2 ring-card">
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
          <div className="sb-pop absolute right-0 top-14 z-50 w-[22rem] max-w-[90vw] overflow-hidden rounded-[20px] bg-card shadow-sheet ring-1 ring-border">
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            <div className="p-sm">
              <p className="mb-sm font-sign text-[17px] font-bold text-text [font-stretch:92%]">
                Giỏ giữ chỗ
              </p>
              {holds.length === 0 ? (
                <p className="rounded-[14px] border-2 border-dashed border-brand/40 bg-tint-primary/40 px-sm py-md text-center text-body-sm text-muted">
                  Bạn chưa giữ chỗ ô nào.
                </p>
              ) : (
                <ul className="flex flex-col gap-xs">
                  {holds.map((hold) => {
                    const slot = slotById.get(hold.slotId);
                    return (
                      <li
                        key={hold.slotId}
                        className="flex items-center justify-between gap-xs rounded-[14px] bg-bg p-xs pl-sm ring-1 ring-border"
                      >
                        <div className="min-w-0">
                          <p className="truncate">
                            <span className="kerb-tag">
                              {slot?.slotCode ?? `Ô #${hold.slotId}`}
                            </span>
                          </p>
                          <p className="mt-1 truncate text-body-sm font-medium text-text/80">
                            Còn {formatCountdown(secondsUntil(hold.expiresAt, nowMs))}
                            {slot ? ` · ${slot.zoneName}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={!slot}
                            className="h-9 rounded-full bg-primary px-sm text-label font-semibold text-on-primary transition-colors hover:bg-primary-pressed disabled:opacity-50"
                            onClick={() => openHold(hold)}
                          >
                            Nộp hồ sơ
                          </button>
                          <button
                            type="button"
                            className="h-9 rounded-full px-sm text-label font-semibold text-error ring-1 ring-error/30 transition-colors hover:bg-tint-error"
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
          </div>
        </>
      )}
    </div>
  );
}
