import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { ResponsiveGrid } from '@/components/data';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { errorMessage } from '@/core/api';
import type { StorefrontQuery, StorefrontSort } from '@/core/api/commerce-api';
import { hasActiveFilters } from '../discovery-filters';
import { useDiscoveryStore } from '../discovery-store';
import { useStorefronts } from '../useDiscovery';
import { StorefrontCard } from './StorefrontCard';

const SORT_LABELS: Record<StorefrontSort, string> = {
  distance: 'Gần nhất',
  rating: 'Đánh giá',
  name: 'Tên',
};

type Props = {
  query: StorefrontQuery;
  /** The sort actually in effect (the query's own). */
  sort: StorefrontSort;
  onSortChange: (sort: StorefrontSort) => void;
};

/** The open storefronts for a query (DISC-03), with a sort switch. */
export function StorefrontList({ query, sort, onSortChange }: Props) {
  const navigate = useNavigate();
  const filters = useDiscoveryStore((s) => s.filters);
  const resetFilters = useDiscoveryStore((s) => s.resetFilters);
  const result = useStorefronts(query);
  // "Nearest" needs a position to measure from.
  const sorts: StorefrontSort[] = query.position ? ['distance', 'rating', 'name'] : ['rating', 'name'];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-headline-md text-text">
          {result.data ? `${result.data.length} quán ăn` : 'Quán ăn'}
        </h2>
        <SegmentedControl
          options={sorts.map((value) => ({ value, label: SORT_LABELS[value] }))}
          value={sort}
          onChange={onSortChange}
        />
      </div>
      {result.isPending ? <LoadingState /> : null}
      {result.isError ? <ErrorState message={errorMessage(result.error)} onRetry={() => result.refetch()} /> : null}
      {result.isSuccess && result.data.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title="Không có quán phù hợp"
          description="Thử bỏ bớt bộ lọc hoặc chọn khu vực khác."
          action={
            hasActiveFilters(filters) ? (
              <Button label="Xoá lọc" variant="outline" fullWidth={false} onPress={resetFilters} />
            ) : undefined
          }
        />
      ) : null}
      {result.data && result.data.length > 0 ? (
        <ResponsiveGrid minItemWidth={236}>
          {result.data.map((storefront) => (
            <StorefrontCard
              key={storefront.storefrontId}
              storefront={storefront}
              onPress={() => navigate(`/customer/explore/stores/${storefront.storefrontId}`)}
            />
          ))}
        </ResponsiveGrid>
      ) : null}
    </div>
  );
}
