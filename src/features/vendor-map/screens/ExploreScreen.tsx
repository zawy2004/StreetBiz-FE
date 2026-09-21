import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Avatar, Card, Icon, KerbTag } from '@/components/common';
import { ResponsiveGrid } from '@/components/data';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { Screen, ThemeSwitchButton } from '@/components/layout';
import { StatusChip } from '@/components/status';
import type { StorefrontSort } from '@/core/api/commerce-api';
import { FilterBar } from '@/features/buyer-discovery/components/FilterBar';
import { LocationBar } from '@/features/buyer-discovery/components/LocationBar';
import { StorefrontList } from '@/features/buyer-discovery/components/StorefrontList';
import { storefrontQuery } from '@/features/buyer-discovery/discovery-filters';
import { formatDistance } from '@/features/buyer-discovery/discovery-format';
import { useDiscoveryStore } from '@/features/buyer-discovery/discovery-store';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { colors } from '@/theme';
import { ActiveVendorMap } from '../components/ActiveVendorMap';
import { communityApi, CommunityApiError } from '../community-api';

type Tab = 'STOREFRONTS' | 'VENDORS';

const VENDOR_RADIUS_METERS = 5_000;

/**
 * The buyer's home: an orange header that asks the only question that matters
 * at lunchtime, the search box and the buyer's location, then the stalls.
 */
export function ExploreScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>('STOREFRONTS');

  return (
    <Screen padded={false}>
      <header className="bg-primary text-white dark:border-b dark:border-border dark:bg-card">
        <div className="mx-auto max-w-[1320px] px-md pb-xl pt-md md:px-lg lg:px-xl lg:pb-2xl lg:pt-xl">
          <div className="flex items-start justify-between gap-sm">
            <div className="min-w-0">
              <h1 className="text-headline-lg text-white lg:text-display-lg">Hôm nay ăn gì trên phố?</h1>
              <p className="mt-1 max-w-[52ch] text-body-md text-white/85 lg:text-body-lg">
                Quán vỉa hè có giấy phép của phường, đang mở bán quanh bạn.
              </p>
            </div>
            {!isDesktop ? <ThemeSwitchButton onDark /> : null}
          </div>

          <button
            type="button"
            aria-label="Tìm kiếm"
            onClick={() => navigate('/customer/explore/search')}
            className="mt-md flex h-12 w-full max-w-[640px] items-center gap-sm rounded-sm bg-card px-sm text-left text-body-lg text-muted shadow-sheet transition-shadow hover:shadow-card-hover dark:border dark:border-border dark:bg-sunken"
          >
            <Icon name="magnify" size={22} color={colors.primary} />
            <span className="truncate">Tìm món, quán hoặc tuyến phố</span>
          </button>

          <div className="mt-sm">
            <LocationBar tone="onPrimary" showArea={tab === 'STOREFRONTS'} />
          </div>
        </div>
      </header>

      <div className="relative -mt-md rounded-t-lg bg-bg">
        <div className="cq mx-auto flex max-w-[1320px] flex-col gap-md px-md pb-xl pt-md md:px-lg lg:px-xl lg:pt-lg">
          <SegmentedControl
            options={[
              { value: 'STOREFRONTS', label: 'Quán ăn' },
              { value: 'VENDORS', label: 'Trên bản đồ' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'STOREFRONTS' ? <StorefrontsTab /> : <VendorsTab />}
        </div>
      </div>
    </Screen>
  );
}

function StorefrontsTab() {
  const position = useDiscoveryStore((s) => s.position);
  const filters = useDiscoveryStore((s) => s.filters);
  const [sort, setSort] = useState<StorefrontSort | null>(null);
  const query = useMemo(() => storefrontQuery(filters, position, '', sort), [filters, position, sort]);

  return (
    <>
      <FilterBar showRadius={position != null} />
      <StorefrontList query={query} sort={query.sort ?? 'name'} onSortChange={setSort} />
    </>
  );
}

function VendorsTab() {
  const navigate = useNavigate();
  const position = useDiscoveryStore((s) => s.position);
  const vendors = useQuery({
    queryKey: ['community', 'vendors', position],
    queryFn: () =>
      communityApi.activeVendors(position ? { ...position, radiusMeters: VENDOR_RADIUS_METERS } : undefined),
  });
  const records = vendors.data ?? [];

  return (
    <>
      {vendors.isPending ? <LoadingState /> : null}
      {vendors.isError ? (
        <ErrorState
          message={
            vendors.error instanceof CommunityApiError
              ? vendors.error.message
              : 'Không tải được danh sách hộ kinh doanh.'
          }
          onRetry={() => vendors.refetch()}
        />
      ) : null}
      {vendors.isSuccess && records.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title={
            position
              ? `Không có hộ kinh doanh trong bán kính ${VENDOR_RADIUS_METERS / 1000} km`
              : 'Chưa có hộ kinh doanh đang hoạt động'
          }
          description={position ? 'Xoá vị trí để xem toàn thành phố.' : undefined}
        />
      ) : null}
      {records.length > 0 ? (
        <>
          <ActiveVendorMap
            vendors={records}
            onSelect={(vendor) => navigate(`/customer/explore/vendors/${vendor.vendorId}`)}
          />
          <ResponsiveGrid minItemWidth={300} gap="sm">
            {records.map((vendor) => (
              <Card
                key={`${vendor.vendorId}-${vendor.slotId}`}
                onPress={() => navigate(`/customer/explore/vendors/${vendor.vendorId}`)}
              >
                <div className="flex gap-sm">
                  <Avatar name={vendor.displayName} size={48} shape="rounded" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-xs">
                      <span className="truncate text-headline-sm text-text">{vendor.displayName}</span>
                      <StatusChip code="VALID" />
                    </div>
                    <div className="flex min-w-0 items-center gap-xs">
                      <KerbTag code={vendor.slotCode} />
                      <span className="truncate text-body-sm text-muted">{vendor.zoneName}</span>
                    </div>
                    <span className="text-body-sm text-muted">
                      {vendor.communityRating
                        ? `${vendor.communityRating.toFixed(1)} ★ (${vendor.communityCount})`
                        : 'Chưa có đánh giá'}
                      {vendor.distanceMeters != null ? ` · ${formatDistance(vendor.distanceMeters)}` : ''}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </ResponsiveGrid>
        </>
      ) : null}
      <p className="flex items-center justify-center gap-1.5 text-body-sm text-muted">
        <Icon name="shield-check-outline" size={16} color={colors.tertiary} />
        Chỉ hiện hộ kinh doanh có giấy phép còn hiệu lực
      </p>
    </>
  );
}
