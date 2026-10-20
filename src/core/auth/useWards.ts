import { useQuery } from '@tanstack/react-query';

import { errorMessage, referenceApi, type Ward } from '@/core/api';
import { isLiveApi } from '@/core/config/env';

/**
 * Wards for the sign-up and registration pickers, from
 * `GET /api/administrative-units/wards`.
 *
 * In mock mode the list falls back to the wards used by `src/mocks/seed.ts`
 * so the flow is still demoable with no backend running.
 */
const MOCK_WARDS: Ward[] = [
  { unitId: 10, unitName: 'Phường Hải Châu 1', parentName: 'Thành phố Đà Nẵng' },
  { unitId: 11, unitName: 'Phường Thanh Khê Đông', parentName: 'Thành phố Đà Nẵng' },
  { unitId: 12, unitName: 'Phường An Hải Bắc', parentName: 'Thành phố Đà Nẵng' },
];

export function useWards() {
  const query = useQuery({
    queryKey: ['wards'],
    queryFn: () => referenceApi.listWards(),
    enabled: isLiveApi,
    staleTime: 30 * 60 * 1000, // reference data; refetching per screen is wasteful
  });

  return {
    wards: isLiveApi ? (query.data ?? []) : MOCK_WARDS,
    loading: isLiveApi && query.isLoading,
    error: query.isError ? errorMessage(query.error) : undefined,
  };
}
