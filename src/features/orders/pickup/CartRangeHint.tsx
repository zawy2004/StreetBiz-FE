import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { isLiveApi } from '@/core/config/env';
import { useDiscoveryStore } from '@/features/buyer-discovery/discovery-store';
import { colors } from '@/theme';
import { orderApi } from '../api/orderApi';
import { distanceLabel, evaluatePickupRange } from './pickup-range';
import { pickupRangeKey } from './usePickupRange';

/**
 * ORD-01 in the cart: if the customer already shared where they are (on Explore) and the stall is
 * beyond the pickup range, say so before they reach the pay button. It never asks for location
 * itself and never blocks the cart; checkout makes the binding check.
 */
export function CartRangeHint({ storefrontId }: { storefrontId: number | undefined }) {
  const position = useDiscoveryStore((state) => state.position);
  const range = useQuery({
    queryKey: pickupRangeKey(storefrontId ?? ''),
    queryFn: () => orderApi.pickupRange(storefrontId!),
    enabled: isLiveApi && Boolean(storefrontId) && Boolean(position),
    staleTime: 5 * 60_000,
  });
  if (!position || !range.data?.enforced) return null;

  // Discovery keeps no accuracy figure: judge the plain distance.
  const verdict = evaluatePickupRange(range.data, { ...position, accuracyMeters: 0 });
  if (verdict.status === 'WITHIN') return null;

  return (
    <div
      role="status"
      className="flex items-start gap-xs rounded-md border px-md py-sm text-body-md"
      style={{ backgroundColor: 'rgb(var(--c-secondary) / 0.1)', borderColor: 'rgb(var(--c-secondary) / 0.35)' }}
    >
      <Icon name="map-marker-outline" size={18} color={colors.onSecondary} className="mt-px shrink-0" />
      <p className="text-text">
        Quán cách bạn {distanceLabel(verdict.distanceMeters)}, ngoài phạm vi nhận món{' '}
        {distanceLabel(verdict.radiusMeters)}.{' '}
        <span className="text-muted">Bạn vẫn giữ được giỏ hàng; hãy đến gần quán hơn để thanh toán.</span>
      </p>
    </div>
  );
}
