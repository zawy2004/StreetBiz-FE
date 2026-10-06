import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { isLiveApi } from '@/core/config/env';
import { colors } from '@/theme';
import { orderApi } from '../api/orderApi';
import { distanceLabel } from './pickup-range';
import { pickupRangeKey } from './usePickupRange';

/**
 * ORD-01 early: on a storefront page, before anything goes into a cart. Only when discovery
 * already knows the customer's position (it never asks for it here) and they are beyond the
 * pickup range. The menu stays browsable; checkout makes the binding check.
 */
export function OutOfRangeHint({
  storefrontId,
  distanceMeters,
}: {
  storefrontId: number;
  distanceMeters: number | null | undefined;
}) {
  const range = useQuery({
    queryKey: pickupRangeKey(storefrontId),
    queryFn: () => orderApi.pickupRange(storefrontId),
    enabled: isLiveApi && distanceMeters != null,
    staleTime: 5 * 60_000,
  });
  const info = range.data;
  if (!info?.enforced || distanceMeters == null || distanceMeters <= info.radiusMeters) return null;

  return (
    <p className="flex items-start gap-xs text-body-sm text-muted">
      <Icon name="information-outline" size={16} color={colors.onSecondary} className="mt-px shrink-0" />
      <span>
        Ngoài phạm vi đặt món ({distanceLabel(info.radiusMeters)}). Bạn vẫn xem được thực đơn;
        hãy đến gần quán hơn để đặt và tự lấy món.
      </span>
    </p>
  );
}
