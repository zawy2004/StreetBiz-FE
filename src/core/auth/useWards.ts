import { useQuery } from '@tanstack/react-query';

import { errorMessage, referenceApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { DA_NANG_WARDS } from './danang-wards';

/**
 * Wards for the sign-up and registration pickers, from
 * `GET /api/administrative-units/wards`: Đà Nẵng's phường, xã and đặc khu.
 *
 * In mock mode the list falls back to the same 94 units (`danang-wards.ts`)
 * so the flow is still demoable with no backend running.
 */

export function useWards() {
  const query = useQuery({
    queryKey: ['wards'],
    queryFn: () => referenceApi.listWards(),
    enabled: isLiveApi,
    staleTime: 30 * 60 * 1000, // reference data; refetching per screen is wasteful
  });

  return {
    wards: isLiveApi ? (query.data ?? []) : DA_NANG_WARDS,
    loading: isLiveApi && query.isLoading,
    error: query.isError ? errorMessage(query.error) : undefined,
  };
}
