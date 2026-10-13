import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
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
  /** Home listing: the first stall gets the wide magazine spread. */
  featureFirst?: boolean;
};

const GRID = 'grid gap-x-lg gap-y-xl sm:grid-cols-2 lg:grid-cols-3';

/** The open storefronts for a query (DISC-03), with a sort switch. */
export function StorefrontList({ query, sort, onSortChange, featureFirst = false }: Props) {
  const navigate = useNavigate();
  const filters = useDiscoveryStore((s) => s.filters);
  const resetFilters = useDiscoveryStore((s) => s.resetFilters);
  const result = useStorefronts(query);
  // "Nearest" needs a position to measure from.
  const sorts: StorefrontSort[] = query.position
    ? ['distance', 'rating', 'name']
    : ['rating', 'name'];
  // Counted from the list already on screen: what can be eaten right now.
  const openCount = result.data?.filter((s) => s.isOpenNow).length;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-end justify-between gap-sm">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-sm gap-y-1">
            <h2 className="font-heading text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-text lg:text-[40px]">
              {result.data ? `${result.data.length} quán ăn` : 'Quán ăn'}
            </h2>
            {openCount != null && result.data!.length > 0 ? (
              <span className="flex h-7 items-center gap-1.5 self-center rounded-full bg-tint-tertiary px-2.5 text-label font-semibold text-tertiary">
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  {openCount > 0 ? (
                    <span className="sb-ping absolute inset-0 rounded-full bg-tertiary" />
                  ) : null}
                  <span
                    className={`relative h-2 w-2 rounded-full ${openCount > 0 ? 'bg-tertiary' : 'bg-muted'}`}
                  />
                </span>
                {openCount} đang mở
              </span>
            ) : null}
          </div>
          <p className="text-body-md text-muted">
            Quán nào cũng bán ở một ô vỉa hè được phường cấp phép.
          </p>
        </div>
        <SegmentedControl
          options={sorts.map((value) => ({ value, label: SORT_LABELS[value] }))}
          value={sort}
          onChange={onSortChange}
        />
      </div>
      {result.isPending ? <StorefrontGridSkeleton featureFirst={featureFirst} /> : null}
      {result.isError ? (
        <ErrorState message={errorMessage(result.error)} onRetry={() => result.refetch()} />
      ) : null}
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
        <div className={GRID}>
          {result.data.map((storefront, index) => {
            const feature = featureFirst && index === 0;
            return (
              <div key={storefront.storefrontId} className={feature ? 'sm:col-span-2' : undefined}>
                <StorefrontCard
                  storefront={storefront}
                  variant={feature ? 'feature' : 'standard'}
                  onPress={() => navigate(`/customer/explore/stores/${storefront.storefrontId}`)}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Card-shaped placeholders, so the grid does not jump when the stalls arrive. */
function StorefrontGridSkeleton({ featureFirst }: { featureFirst: boolean }) {
  return (
    <div role="status" aria-label="Đang tải quán ăn">
      <div className={GRID}>
        {featureFirst ? (
          <Skeleton className="aspect-[4/3] w-full !rounded-[28px] sm:col-span-2 md:aspect-auto md:h-[430px]" />
        ) : null}
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-sm">
            <Skeleton className="aspect-[4/3] w-full !rounded-[22px]" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
