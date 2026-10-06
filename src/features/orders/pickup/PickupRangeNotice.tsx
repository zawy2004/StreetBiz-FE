import type { ReactNode } from 'react';

import { Button, Icon, Spinner } from '@/components/common';
import { LOCATE_MESSAGES } from '@/features/buyer-discovery/geolocation';
import { colors } from '@/theme';
import { DirectionsLink } from '../tracking/PickupPointCard';
import { distanceLabel } from './pickup-range';
import type { usePickupRange } from './usePickupRange';

type PickupRange = ReturnType<typeof usePickupRange>;

/** A soft turmeric panel, the app's "needs your attention" tone: never the red of an error. */
function AttentionPanel({
  title,
  children,
  action,
}: {
  title: string;
  children: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="sb-fade-in rounded-sm border px-sm py-xs"
      style={{
        backgroundColor: 'rgb(var(--c-secondary) / 0.1)',
        borderColor: 'rgb(var(--c-secondary) / 0.35)',
      }}
    >
      <p className="flex items-center gap-2xs text-label text-text">
        <Icon name="map-marker-outline" size={16} color={colors.onSecondary} />
        {title}
      </p>
      <p className="mt-2xs text-body-sm text-muted">{children}</p>
      {action ? <div className="mt-xs flex flex-wrap gap-xs">{action}</div> : null}
    </div>
  );
}

/**
 * ORD-01 on the checkout screen: is the customer close enough to collect this order? It updates
 * as they move, says why ordering is blocked in plain words, and always says how to fix it.
 */
export function PickupRangeNotice({ range }: { range: PickupRange }) {
  const { info, live, verdict, enforced } = range;
  if (!enforced) return null;
  const radius = info.data ? distanceLabel(info.data.radiusMeters) : null;
  const why = `StreetBiz chỉ nhận đơn khi bạn ở trong phạm vi ${radius ?? 'cho phép'} quanh quán, vì bạn sẽ tự đến quầy lấy món.`;
  const retry = <Button label="Thử lại" variant="outline" size="sm" fullWidth={false} onPress={live.retry} />;

  if (live.status === 'DENIED') {
    return (
      <AttentionPanel title="Cần quyền vị trí để đặt món" action={retry}>
        {`${why} Hãy cho phép định vị cho trang này rồi bấm Thử lại.`}
      </AttentionPanel>
    );
  }
  if (live.status === 'UNAVAILABLE' || live.status === 'FAILED') {
    return (
      <AttentionPanel title={LOCATE_MESSAGES[live.status]} action={retry}>
        {why}
      </AttentionPanel>
    );
  }
  if (!verdict) {
    return (
      <p className="flex items-center gap-xs text-body-sm text-muted">
        <Spinner size={14} />
        Đang xác định vị trí của bạn…
      </p>
    );
  }
  if (verdict.status === 'INACCURATE') {
    return (
      <AttentionPanel
        title={`Vị trí chưa đủ chính xác (sai số ${distanceLabel(verdict.accuracyMeters)})`}
        action={retry}
      >
        Hãy bật GPS hoặc chế độ định vị chính xác, ra chỗ thoáng hơn rồi thử lại.
      </AttentionPanel>
    );
  }
  if (verdict.status === 'OUT_OF_RANGE') {
    return (
      <AttentionPanel
        title={`Bạn đang cách quán ${distanceLabel(verdict.distanceMeters)}`}
        action={info.data ? <DirectionsLink point={info.data.pickupPoint} label="Chỉ đường đến quán" /> : null}
      >
        {`${why} Khoảng cách tự cập nhật khi bạn đến gần hơn.`}
      </AttentionPanel>
    );
  }
  return (
    <p className="sb-fade-in flex items-center gap-xs text-body-sm text-text">
      <Icon name="walk" size={16} color={colors.tertiary} />
      <span>
        Bạn cách quán {distanceLabel(verdict.distanceMeters)}
        <span className="text-muted"> · trong phạm vi nhận món {radius}</span>
      </span>
    </p>
  );
}
