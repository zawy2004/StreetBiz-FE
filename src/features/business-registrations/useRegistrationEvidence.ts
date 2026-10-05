import { useQuery } from '@tanstack/react-query';

import { vendorRegistrationApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { REGISTRATIONS_KEY } from './useRegistrations';

/**
 * The documents already attached to a registration on the server. For a draft this is the source of
 * truth for what has been uploaded, since the picked files themselves cannot survive a reload.
 */
export function useRegistrationEvidence(registrationId: number | null) {
  return useQuery({
    queryKey: [...REGISTRATIONS_KEY, registrationId, 'evidence'],
    queryFn: () => vendorRegistrationApi.get(registrationId!),
    enabled: isLiveApi && registrationId !== null,
    select: (detail) => detail.evidence,
  });
}
