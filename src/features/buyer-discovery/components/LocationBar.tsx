import { useEffect } from 'react';

import { Button, Icon } from '@/components/common';
import { colors } from '@/theme';
import { formatDistance } from '../discovery-format';
import { useDiscoveryStore } from '../discovery-store';
import { LOCATE_MESSAGES } from '../geolocation';
import { useServiceAreas } from '../useDiscovery';

type Props = { showArea?: boolean };

/** Where the customer is (DISC-01) and which area they want to eat in (DISC-02). */
export function LocationBar({ showArea = true }: Props) {
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
      <div className="flex flex-wrap items-center gap-sm">
        <Button
          label={position ? 'Cập nhật vị trí' : 'Tìm quanh tôi'}
          variant="outline"
          fullWidth={false}
          loading={locateStatus === 'LOCATING'}
          onPress={() => void locate()}
          icon={<Icon name="crosshairs-gps" size={18} color={colors.indigo} />}
        />
        {position ? <Button label="Xoá vị trí" variant="ghost" fullWidth={false} onPress={clearPosition} /> : null}
        {showArea && areaList.length > 0 ? (
          <label className="flex h-12 min-w-0 items-center gap-xs rounded-sm border border-border bg-card px-sm text-label text-text">
            <Icon name="map-marker-outline" size={18} color={colors.muted} />
            <select
              aria-label="Khu vực"
              value={wardId ?? ''}
              onChange={(e) => setFilters({ wardId: e.target.value ? Number(e.target.value) : null })}
              className="min-w-0 cursor-pointer truncate bg-transparent outline-none"
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
      </div>
      {failure ? <p className="text-body-sm text-error">{failure}</p> : null}
      {showArea && nearest && wardId == null ? (
        <button
          type="button"
          onClick={() => setFilters({ wardId: nearest.wardId })}
          className="w-fit text-left text-body-sm text-primary"
        >
          Gần bạn nhất: {nearest.wardName}
          {nearest.distanceMeters != null ? ` · ${formatDistance(nearest.distanceMeters)}` : ''} — chọn khu vực này
        </button>
      ) : null}
    </div>
  );
}
