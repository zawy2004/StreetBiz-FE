import { startTransition, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Avatar, Icon, KerbTag } from '@/components/common';
import { ResponsiveGrid } from '@/components/data';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import type { StorefrontSort } from '@/core/api/commerce-api';
import { AreaStrip } from '@/features/buyer-discovery/components/AreaStrip';
import { FilterBar } from '@/features/buyer-discovery/components/FilterBar';
import { StorefrontList } from '@/features/buyer-discovery/components/StorefrontList';
import { storefrontQuery } from '@/features/buyer-discovery/discovery-filters';
import { formatDistance } from '@/features/buyer-discovery/discovery-format';
import { useDiscoveryStore } from '@/features/buyer-discovery/discovery-store';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { colors } from '@/theme';
import { ActiveVendorMap } from '../components/ActiveVendorMap';
import { ExploreHero } from '../components/ExploreHero';
import { communityApi, CommunityApiError } from '../community-api';

type Tab = 'STOREFRONTS' | 'VENDORS';

const VENDOR_RADIUS_METERS = 5_000;

/**
 * The buyer's home, laid out like a street-food magazine: the cover (question,
 * search, location, the food), the painted kerb, a strip of dishes and switches
 * that stays at hand while scrolling (desktop), the stalls with the first one as
 * a spread, then why a licensed pavement stall can be trusted.
 */
export function ExploreScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>('STOREFRONTS');
  const position = useDiscoveryStore((s) => s.position);

  return (
    <Screen padded={false}>
      <ExploreHero
        isDesktop={isDesktop}
        showArea={tab === 'STOREFRONTS'}
        onSearch={() => navigate('/customer/explore/search')}
      />
      <div aria-hidden="true" className="sb-kerb" />

      <div className="z-20 border-b border-border/70 bg-bg lg:sticky lg:top-0 lg:bg-bg/90 lg:backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-sm px-md py-sm md:px-lg lg:flex-row lg:items-center lg:gap-md lg:px-xl">
          <div className="shrink-0">
            <SegmentedControl
              options={[
                { value: 'STOREFRONTS', label: 'Quán ăn' },
                { value: 'VENDORS', label: 'Trên bản đồ' },
              ]}
              value={tab}
              // Switching tabs swaps a whole list for a map: let the tap paint first.
              onChange={(next) => startTransition(() => setTab(next))}
            />
          </div>
          {tab === 'STOREFRONTS' ? (
            <div className="min-w-0 flex-1">
              <FilterBar showRadius={position != null} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="cq mx-auto flex max-w-[1320px] flex-col gap-lg px-md pb-2xl pt-lg md:px-lg lg:gap-xl lg:px-xl lg:pt-xl">
        {tab === 'STOREFRONTS' ? <StorefrontsTab /> : <VendorsTab />}
      </div>

      <TrustBand onScan={() => navigate('/customer/scan')} />
    </Screen>
  );
}

function StorefrontsTab() {
  const position = useDiscoveryStore((s) => s.position);
  const filters = useDiscoveryStore((s) => s.filters);
  const [sort, setSort] = useState<StorefrontSort | null>(null);
  const query = useMemo(
    () => storefrontQuery(filters, position, '', sort),
    [filters, position, sort],
  );

  return (
    <>
      <div id="explore-listing" className="scroll-mt-[96px]">
        <StorefrontList
          query={query}
          sort={query.sort ?? 'name'}
          onSortChange={setSort}
          featureFirst
        />
      </div>
      <div className="mt-lg lg:mt-xl">
        <AreaStrip onPicked={revealListing} />
      </div>
    </>
  );
}

/** After a ward card is picked (below the list), bring the refreshed list back into view. */
function revealListing() {
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document
    .getElementById('explore-listing')
    ?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/**
 * The promise behind every stall, drawn from the street itself: a numbered slot,
 * a permit you can scan, a community that rates and reports. Ends on the one
 * thing a buyer can do about it.
 */
function TrustBand({ onScan }: { onScan: () => void }) {
  return (
    <section
      aria-labelledby="trust-title"
      className="relative isolate overflow-hidden bg-[#FFF3E8] dark:bg-card"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="mx-auto grid max-w-[1320px] gap-xl px-md py-2xl md:px-lg lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-center lg:gap-2xl lg:px-xl lg:py-[72px]">
        <div className="flex flex-col items-start gap-md">
          <h2
            id="trust-title"
            className="font-editorial text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] lg:text-[48px]"
          >
            Ăn vỉa hè, có phường đứng sau.
          </h2>
          <p className="max-w-[40ch] text-body-lg text-text/75">
            Quán trên StreetBiz bán ở đúng ô được cấp, có giấy phép còn hiệu lực. Bạn kiểm tra được
            ngay tại quầy.
          </p>
          <button
            type="button"
            onClick={onScan}
            className="mt-xs flex h-12 items-center gap-sm rounded-full bg-primary pl-md pr-lg text-label font-semibold text-on-primary shadow-[0_10px_24px_-10px_rgb(var(--c-primary)/0.8)] transition-colors hover:bg-primary-pressed"
          >
            <Icon name="qrcode-scan" size={20} color="currentColor" />
            Quét mã QR ở quầy
          </button>
        </div>

        <ul className="grid gap-md sm:grid-cols-3">
          <TrustPoint
            title="Ô vỉa hè có số"
            text="Mỗi quán bán trong một ô được phường kẻ vạch và đánh số."
            art={
              <div className="flex flex-col items-start gap-2">
                <KerbTag code="NVL-08" />
                <span className="sb-kerb sb-kerb-thin w-full rounded-[2px]" />
              </div>
            }
          />
          <TrustPoint
            title="Giấy phép quét được"
            text="Mã QR ở quầy mở giấy phép, tra trực tiếp với phường, không dùng bản lưu."
            art={<PermitArt />}
          />
          <TrustPoint
            title="Cộng đồng chấm điểm"
            text="Người mua đánh giá quán và báo cáo khi quán bán sai chỗ."
            art={
              <div className="flex items-center gap-0.5 text-accent">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Icon key={i} name="star" size={22} color="currentColor" weight="fill" />
                ))}
              </div>
            }
          />
        </ul>
      </div>
    </section>
  );
}

function TrustPoint({ title, text, art }: { title: string; text: string; art: ReactNode }) {
  return (
    <li className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-black/[0.04] dark:bg-sunken lg:p-lg">
      <div aria-hidden="true" className="flex h-12 items-center">
        {art}
      </div>
      <p className="font-sign text-[18px] font-bold leading-tight text-text [font-stretch:92%]">
        {title}
      </p>
      <p className="text-body-md leading-relaxed text-muted">{text}</p>
    </li>
  );
}

/** A small permit pass: QR block, slot code, the green tick. */
function PermitArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 48" className="h-12 w-[120px]">
      <rect
        x="1"
        y="1"
        width="118"
        height="46"
        rx="9"
        fill="rgb(var(--c-card))"
        stroke="rgb(var(--c-border))"
        strokeWidth="2"
      />
      <rect x="1" y="1" width="118" height="6" rx="3" fill="rgb(var(--c-kerb))" />
      {[
        [10, 14],
        [18, 14],
        [10, 22],
        [26, 22],
        [10, 30],
        [18, 30],
        [26, 30],
        [26, 14],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" fill="rgb(var(--c-text))" />
      ))}
      <rect x="44" y="16" width="40" height="7" rx="3.5" fill="rgb(var(--c-text) / 0.8)" />
      <rect x="44" y="28" width="28" height="6" rx="3" fill="rgb(var(--c-muted) / 0.45)" />
      <circle cx="100" cy="27" r="11" fill="rgb(var(--c-tertiary))" />
      <path
        d="M95 27 l3.5 3.5 L106 23"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VendorsTab() {
  const navigate = useNavigate();
  const position = useDiscoveryStore((s) => s.position);
  const vendors = useQuery({
    queryKey: ['community', 'vendors', position],
    queryFn: () =>
      communityApi.activeVendors(
        position ? { ...position, radiusMeters: VENDOR_RADIUS_METERS } : undefined,
      ),
  });
  const records = vendors.data ?? [];

  return (
    <div className="flex flex-col gap-lg">
      {vendors.isPending ? (
        <div role="status" aria-label="Đang tải hộ kinh doanh" className="flex flex-col gap-md">
          <Skeleton className="h-[300px] w-full !rounded-[24px] md:h-[400px]" />
          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[92px] w-full !rounded-[14px]" />
            ))}
          </div>
        </div>
      ) : null}
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
          <ResponsiveGrid minItemWidth={340} gap="sm">
            {records.map((vendor) => (
              <button
                key={`${vendor.vendorId}-${vendor.slotId}`}
                type="button"
                onClick={() => navigate(`/customer/explore/vendors/${vendor.vendorId}`)}
                className="group flex w-full items-center gap-sm rounded-md border border-border bg-card p-sm text-left shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-text/20 hover:shadow-card-hover"
              >
                <Avatar name={vendor.displayName} size={52} shape="rounded" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-xs">
                    <span className="truncate font-editorial text-[18px] font-semibold leading-tight text-text">
                      {vendor.displayName}
                    </span>
                    <StatusChip code="VALID" />
                  </div>
                  <div className="flex min-w-0 items-center gap-xs">
                    <KerbTag code={vendor.slotCode} />
                    <span className="truncate text-body-sm text-muted">{vendor.zoneName}</span>
                  </div>
                  <span className="flex items-center gap-1 text-body-sm text-muted">
                    <Icon name="star" size={14} color={colors.accent} weight="fill" />
                    {vendor.communityRating
                      ? `${vendor.communityRating.toFixed(1)} ★ (${vendor.communityCount})`
                      : 'Chưa có đánh giá'}
                    {vendor.distanceMeters != null
                      ? ` · ${formatDistance(vendor.distanceMeters)}`
                      : ''}
                  </span>
                </div>
                <Icon
                  name="chevron-right"
                  size={18}
                  color={colors.muted}
                  className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </button>
            ))}
          </ResponsiveGrid>
        </>
      ) : null}
      <p className="flex items-center justify-center gap-1.5 text-body-sm text-muted">
        <Icon name="shield-check-outline" size={16} color={colors.tertiary} weight="fill" />
        Chỉ hiện hộ kinh doanh có giấy phép còn hiệu lực
      </p>
    </div>
  );
}
