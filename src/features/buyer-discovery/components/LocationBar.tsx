import { useEffect } from 'react';

import { Icon, Spinner } from '@/components/common';
import { colors } from '@/theme';
import { formatDistance } from '../discovery-format';
import { useDiscoveryStore } from '../discovery-store';
import { LOCATE_MESSAGES } from '../geolocation';
import { useServiceAreas } from '../useDiscovery';

type Props = {
  showArea?: boolean;
  /** `onPrimary` when the bar sits on the orange discovery header. */
  tone?: 'default' | 'onPrimary';
};

/** Where the customer is (DISC-01) and which area they want to eat in (DISC-02). */
export function LocationBar({ showArea = true, tone = 'default' }: Props) {
  const onPrimary = tone === 'onPrimary';
  const position = useDiscoveryStore((s) => s.position);
  const locateStatus = useDiscoveryStore((s) => s.locateStatus);
  const wardId = useDiscoveryStore((s) => s.filters.wardId);
  const locate = useDiscoveryStore((s) => s.locate);
  const clearPosition = useDiscoveryStore((s) => s.clearPosition);
  const setFilters = useDiscoveryStore((s) => s.setFilters);
  const areas = useServiceAreas();
  const areaList = areas.data ?? [];
  const nearest = position ? areaList[0] : undefined;

  // A remembered area can stop having storefronts; drop it rather than filter on nothing.
  useEffect(() => {
    if (areas.data && wardId != null && !areas.data.some((a) => a.wardId === wardId)) {
      setFilters({ wardId: null });
    }
  }, [areas.data, wardId, setFilters]);

  const failure =
    locateStatus === 'UNAVAILABLE' || locateStatus === 'DENIED' || locateStatus === 'FAILED'
      ? LOCATE_MESSAGES[locateStatus]
      : null;

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap items-center gap-xs">
        {showArea && areaList.length > 0 ? (
          <label
            className={[
              'flex h-10 min-w-0 max-w-full items-center gap-1.5 rounded-full px-sm text-label font-semibold',
              onPrimary ? 'bg-white/15 text-white hover:bg-white/20' : 'border border-border bg-card text-text',
            ].join(' ')}
          >
            <Icon name="map-marker" size={18} color={onPrimary ? colors.white : colors.primary} />
            <select
              aria-label="Khu vực"
              value={wardId ?? ''}
              onChange={(e) => setFilters({ wardId: e.target.value ? Number(e.target.value) : null })}
              className="min-w-0 cursor-pointer truncate bg-transparent outline-none [&>option]:text-[#17191C]"
            >
              <option value="">Tất cả khu vực</option>
              {areaList.map((area) => (
                <option key={area.wardId} value={area.wardId}>
                  {area.wardName} ({area.storefrontCount})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => void locate()}
          disabled={locateStatus === 'LOCATING'}
          aria-busy={locateStatus === 'LOCATING' || undefined}
          className={[
            'flex h-10 items-center gap-1.5 rounded-full px-sm text-label font-medium transition-colors disabled:opacity-60',
            onPrimary ? 'bg-white text-primary hover:bg-white/90' : 'border border-border bg-card text-text hover:bg-sunken',
          ].join(' ')}
        >
          {locateStatus === 'LOCATING' ? (
            <Spinner size={16} />
          ) : (
            <Icon name="crosshairs-gps" size={17} color={onPrimary ? colors.primary : colors.indigo} />
          )}
          {position ? 'Cập nhật vị trí' : 'Tìm quanh tôi'}
        </button>
        {position ? (
          <button
            type="button"
            onClick={clearPosition}
            className={`h-10 rounded-full px-sm text-label ${onPrimary ? 'text-white/90 hover:bg-white/10' : 'text-primary hover:bg-tint-primary'}`}
          >
            Xoá vị trí
          </button>
        ) : null}
      </div>
      {failure ? (
        <p className={`text-body-sm ${onPrimary ? 'font-medium text-white' : 'text-error'}`}>{failure}</p>
      ) : null}
      {showArea && nearest && wardId == null ? (
        <button
          type="button"
          onClick={() => setFilters({ wardId: nearest.wardId })}
          className={`w-fit text-left text-body-sm underline-offset-2 hover:underline ${onPrimary ? 'text-white' : 'text-primary'}`}
        >
          Gần bạn nhất: {nearest.wardName}
          {nearest.distanceMeters != null ? ` · ${formatDistance(nearest.distanceMeters)}` : ''} — chọn khu vực này
        </button>
      ) : null}
    </div>
  );
}
