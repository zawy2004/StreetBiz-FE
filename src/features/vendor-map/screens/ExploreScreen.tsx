import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Avatar, Card, Icon, IconButton } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import type { StorefrontSort } from '@/core/api/commerce-api';
import { FilterBar } from '@/features/buyer-discovery/components/FilterBar';
import { LocationBar } from '@/features/buyer-discovery/components/LocationBar';
import { StorefrontList } from '@/features/buyer-discovery/components/StorefrontList';
import { storefrontQuery } from '@/features/buyer-discovery/discovery-filters';
import { formatDistance } from '@/features/buyer-discovery/discovery-format';
import { useDiscoveryStore } from '@/features/buyer-discovery/discovery-store';
import { colors } from '@/theme';
import { ActiveVendorMap } from '../components/ActiveVendorMap';
import { communityApi, CommunityApiError } from '../community-api';

type Tab = 'STOREFRONTS' | 'VENDORS';

const VENDOR_RADIUS_METERS = 5_000;

export function ExploreScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('STOREFRONTS');

  return (
    <Screen>
      <AppHeader
        title="Khám phá"
        subtitle={tab === 'STOREFRONTS' ? 'Quán đang mở bán' : 'Hộ kinh doanh có giấy phép đang hoạt động'}
        right={
          <IconButton
            icon="magnify"
            accessibilityLabel="Tìm kiếm"
            onPress={() => navigate('/customer/explore/search')}
          />
        }
      />
      <LocationBar showArea={tab === 'STOREFRONTS'} />
      <SegmentedControl
        options={[
          { value: 'STOREFRONTS', label: 'Quán ăn' },
          { value: 'VENDORS', label: 'Trên bản đồ' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'STOREFRONTS' ? <StorefrontsTab /> : <VendorsTab />}
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
        />
      ) : null}
      {records.length > 0 ? (
        <>
          <ActiveVendorMap
            vendors={records}
            onSelect={(vendor) => navigate(`/customer/explore/vendors/${vendor.vendorId}`)}
          />
          {records.map((vendor) => (
            <Card
              key={`${vendor.vendorId}-${vendor.slotId}`}
              onPress={() => navigate(`/customer/explore/vendors/${vendor.vendorId}`)}
            >
              <div className="flex gap-sm">
                <Avatar name={vendor.displayName} size={48} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-headline-sm text-text">{vendor.displayName}</span>
                  <span className="truncate text-body-sm text-muted">
                    {vendor.zoneName} · Ô {vendor.slotCode}
                  </span>
                  <span className="text-body-sm text-muted">
                    {vendor.communityRating
                      ? `${vendor.communityRating.toFixed(1)} ★ (${vendor.communityCount})`
                      : 'Chưa có đánh giá'}
                    {vendor.distanceMeters != null ? ` · ${formatDistance(vendor.distanceMeters)}` : ''}
                  </span>
                </div>
                <StatusChip code="VALID" />
              </div>
            </Card>
          ))}
        </>
      ) : null}
      <div className="flex items-center justify-center gap-1.5">
        <Icon name="shield-check-outline" size={16} color={colors.tertiary} />
        <span className="text-body-sm text-muted">Dữ liệu được kiểm tra trực tiếp từ Backend</span>
      </div>
    </>
  );
}
