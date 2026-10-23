import type { VendorReportType } from '@/core/api/ai-api';
import type { PermitVerification } from '@/features/vendor-map/community-api';

/**
 * The complaint form for the stall a check found, with what the check knew: the permit and
 * slot it scanned, and the scanned token so the form can look the price board up again live
 * (nothing from this check is carried over, BR-39).
 */
export function reportFormPath(
  result: Pick<PermitVerification, 'vendorId' | 'permitId' | 'slotId'>,
  token: string | undefined,
  type: VendorReportType,
): string {
  const query = new URLSearchParams({ type });
  if (result.permitId) query.set('permitId', String(result.permitId));
  if (result.slotId) query.set('slotId', String(result.slotId));
  if (token) query.set('qr', token);
  return `/customer/explore/vendors/${result.vendorId}/reports/new?${query.toString()}`;
}
