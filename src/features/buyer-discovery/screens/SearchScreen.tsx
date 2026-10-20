import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import { EmptyState, ErrorState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { Screen } from '@/components/layout';
import { AiHint } from '@/components/status';
import { errorMessage } from '@/core/api';
import type { MarketplaceMenuItem } from '@/core/api/commerce-api';
import { env, isLiveApi } from '@/core/config/env';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMockDb } from '@/mocks/db';
import { colors } from '@/theme';
import { categoryIcon } from '../category-icons';
import { FilterBar } from '../components/FilterBar';
import { LocationBar } from '../components/LocationBar';
import { StorefrontCard } from '../components/StorefrontCard';
import { CravingBoard } from '../components/search/CravingBoard';
import { MenuItemResultCard } from '../components/search/MenuItemResultCard';
import { ResultsHeader } from '../components/search/ResultsHeader';
import { SearchBar } from '../components/search/SearchBar';
import { DishTilesSkeleton, StallCardsSkeleton } from '../components/search/SearchResultsSkeleton';
import {
  hasActiveFilters,
  menuItemQuery,
  menuSortFor,
  storefrontQuery,
  storefrontSortFor,
  type SearchSort,
} from '../discovery-filters';
import { useDiscoveryStore } from '../discovery-store';
import { menuItemPhotos } from '../food-photos';
import { useMenuItemSearch, useServiceAreas, useStorefronts } from '../useDiscovery';

export function SearchScreen() {
  return isLiveApi ? <LiveSearchScreen /> : <MockSearchScreen />;
}

const COUNT_CLASS =
  "font-editorial text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] font-tabular lg:text-[40px]";
const SECTION_TITLE_CLASS =
  'font-editorial text-[22px] font-semibold leading-tight tracking-[-0.01em] text-text lg:text-[26px]';

/** "Thèm gì hôm nay?": what the results line says before anything is asked. */
function IdleTitle() {
  return <h2 className={COUNT_CLASS}>Thèm gì hôm nay?</h2>;
}

function LiveSearchScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SearchSort>('NEAREST');
  const position = useDiscoveryStore((s) => s.position);
  const filters = useDiscoveryStore((s) => s.filters);
  const text = useDebouncedValue(query.trim());
  // Results appear once there is something to ask for: a word, an area or any filter.
  const active = text.length > 0 || filters.wardId != null || hasActiveFilters(filters);
  // "Nearest" needs a position; without one the choice quietly becomes "by name".
  const effectiveSort: SearchSort = sort === 'NEAREST' && !position ? 'NAME' : sort;
  const storefronts = useStorefronts(
    storefrontQuery(filters, position, text, storefrontSortFor(effectiveSort, position)),
    active,
  );
  const items = useMenuItemSearch(menuItemQuery(filters, text, menuSortFor(effectiveSort)), active);
  // Same key as the location bar's own read: no extra request, just the ward's name.
  const areas = useServiceAreas();
  const sorts: { value: SearchSort; label: string }[] = [
    ...(position ? [{ value: 'NEAREST' as const, label: 'Gần nhất' }] : []),
    { value: 'NAME', label: 'Tên' },
    { value: 'RATING', label: 'Đánh giá' },
    { value: 'PRICE_ASC', label: 'Giá thấp' },
    { value: 'PRICE_DESC', label: 'Giá cao' },
  ];
  const nothingFound =
    storefronts.isSuccess &&
    items.isSuccess &&
    storefronts.data.length === 0 &&
    items.data.length === 0;
  // The board of dishes goes as soon as anything is typed, so its names never sit beside results.
  const idle = !active && query.length === 0;

  const dishes = items.data ?? [];
  const stalls = storefronts.data ?? [];
  const showDishes = active && (items.isPending || items.isError || dishes.length > 0);
  const showStalls = active && (storefronts.isPending || storefronts.isError || stalls.length > 0);
  const both = showDishes && showStalls;
  const wardName =
    filters.wardId != null
      ? areas.data?.find((area) => area.wardId === filters.wardId)?.wardName
      : undefined;

  let title: ReactNode | null;
  if (idle) {
    title = <IdleTitle />;
  } else if (!active) {
    title = <p className="text-body-lg text-muted">Gõ tên món hoặc quán để tìm.</p>;
  } else if (items.isPending || storefronts.isPending) {
    title = null;
  } else {
    const parts = [
      items.isSuccess ? `${dishes.length} món` : null,
      storefronts.isSuccess ? `${stalls.length} quán` : null,
    ].filter(Boolean);
    title = (
      <p className={COUNT_CLASS}>
        {parts.length > 0
          ? `${parts.join(', ')}${wardName ? ` ở ${wardName}` : ''}`
          : 'Chưa tải được kết quả'}
      </p>
    );
  }

  const scopeNotes = [
    filters.maxPrice != null ? 'Mức giá chỉ áp cho món' : null,
    filters.radiusMeters != null && position ? 'Khoảng cách chỉ áp cho quán' : null,
  ].filter((note): note is string => note != null);

  return (
    <SearchLayout
      query={query}
      setQuery={setQuery}
      controls={
        <>
          <LocationBar />
          <FilterBar showRadius={position != null} showPrice />
          {scopeNotes.length > 0 ? (
            <p className="flex flex-wrap items-center gap-x-md gap-y-1 text-body-sm text-muted">
              {scopeNotes.map((note) => (
                <span key={note} className="flex items-center gap-1.5">
                  <Icon name="information-outline" size={15} color={colors.indigo} />
                  {note}
                </span>
              ))}
            </p>
          ) : null}
        </>
      }
      header={
        <ResultsHeader
          title={title}
          live={active}
          sort={<SegmentedControl options={sorts} value={effectiveSort} onChange={setSort} />}
        />
      }
    >
      {idle ? <CravingBoard onPick={setQuery} /> : null}
      {nothingFound ? (
        <EmptyState
          icon="magnify"
          title="Không tìm thấy kết quả"
          description="Thử từ khoá ngắn hơn hoặc bỏ bớt bộ lọc."
        />
      ) : null}
      {!nothingFound && (showDishes || showStalls) ? (
        <div
          key={text}
          className={
            both
              ? 'grid gap-xl lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-lg xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-xl'
              : 'flex flex-col gap-xl'
          }
        >
          {showDishes ? (
            <section aria-label="Món" className="flex min-w-0 flex-col gap-md">
              <h2 className={SECTION_TITLE_CLASS}>
                {items.data ? `Món (${dishes.length})` : 'Món'}
              </h2>
              {items.isPending ? (
                <DishTilesSkeleton
                  columnsClass={
                    both
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                  }
                />
              ) : null}
              {items.isError ? (
                <ErrorState message={errorMessage(items.error)} onRetry={() => items.refetch()} />
              ) : null}
              {dishes.length === 1 ? (
                <MenuItemResultCard
                  variant="wide"
                  item={liveCardData(dishes[0]!)}
                  onPress={() => navigate(`/customer/explore/items/${dishes[0]!.menuItemId}`)}
                />
              ) : null}
              {dishes.length > 1 ? (
                <ul
                  className={`grid gap-x-md gap-y-lg ${both ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}
                >
                  {dishes.map((item, index) => (
                    <li key={item.menuItemId} className="min-w-0">
                      <MenuItemResultCard
                        index={index}
                        item={liveCardData(item)}
                        onPress={() => navigate(`/customer/explore/items/${item.menuItemId}`)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {showStalls ? (
            <section aria-label="Quán" className="flex min-w-0 flex-col gap-md">
              <h2 className={SECTION_TITLE_CLASS}>
                {storefronts.data ? `Quán (${stalls.length})` : 'Quán'}
              </h2>
              {storefronts.isPending ? (
                <StallCardsSkeleton
                  columnsClass={
                    both ? 'sm:grid-cols-2 lg:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'
                  }
                />
              ) : null}
              {storefronts.isError ? (
                <ErrorState
                  message={errorMessage(storefronts.error)}
                  onRetry={() => storefronts.refetch()}
                />
              ) : null}
              {/* One stall alone gets the magazine spread, unless it sits in the narrow side column. */}
              {stalls.length === 1 && (!both || !isDesktop) ? (
                <StorefrontCard
                  variant="feature"
                  storefront={stalls[0]!}
                  onPress={() => navigate(`/customer/explore/stores/${stalls[0]!.storefrontId}`)}
                />
              ) : null}
              {stalls.length > 1 || (stalls.length === 1 && both && isDesktop) ? (
                <ul
                  className={`no-scrollbar -mx-md flex snap-x snap-mandatory gap-md overflow-x-auto px-md pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-x-lg md:gap-y-xl md:overflow-visible md:px-0 ${both ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}
                >
                  {stalls.map((storefront) => (
                    <li
                      key={storefront.storefrontId}
                      className="w-[280px] shrink-0 snap-start md:w-auto"
                    >
                      <StorefrontCard
                        storefront={storefront}
                        onPress={() =>
                          navigate(`/customer/explore/stores/${storefront.storefrontId}`)
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </SearchLayout>
  );
}

function liveCardData(item: MarketplaceMenuItem) {
  return {
    itemName: item.itemName,
    storefrontName: item.storefrontName,
    categoryName: item.categoryName,
    unitPrice: item.unitPrice,
    soldOut: item.availabilityStatus === 'SOLD_OUT',
    certified: Boolean(item.foodSafetyCertified),
    photos: menuItemPhotos(item),
    icon: categoryIcon(item.categoryName),
  };
}

function MockSearchScreen() {
  const navigate = useNavigate();
  const menuItems = useMockDb((state) => state.menuItems);
  const storefronts = useMockDb((state) => state.storefronts);
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        storefronts
          .find((storefront) => storefront.id === item.storefrontId)
          ?.name.toLowerCase()
          .includes(normalized),
    );
  }, [menuItems, query, storefronts]);

  const cards = results.map((item) => ({
    id: item.id,
    data: {
      itemName: item.name,
      storefrontName: storefronts.find((row) => row.id === item.storefrontId)?.name,
      unitPrice: item.price,
      soldOut: item.availability_status === 'SOLD_OUT',
      certified: false,
      photos: menuItemPhotos({ itemName: item.name }),
      icon: categoryIcon(item.name),
    },
  }));

  return (
    <SearchLayout
      query={query}
      setQuery={setQuery}
      header={
        <ResultsHeader
          title={
            query ? (
              results.length > 0 ? (
                <p className={COUNT_CLASS}>{`${results.length} món`}</p>
              ) : (
                <span />
              )
            ) : (
              <IdleTitle />
            )
          }
          live
        />
      }
    >
      {!query ? <CravingBoard onPick={setQuery} /> : null}
      {query && results.length === 0 ? (
        <EmptyState
          icon="magnify"
          title="Không tìm thấy kết quả"
          description="Thử từ khoá ngắn hơn hoặc bỏ bớt bộ lọc."
        />
      ) : null}
      {cards.length === 1 ? (
        <MenuItemResultCard
          variant="wide"
          item={cards[0]!.data}
          onPress={() => navigate(`/customer/explore/items/${cards[0]!.id}`)}
        />
      ) : null}
      {cards.length > 1 ? (
        <ul className="grid grid-cols-2 gap-x-md gap-y-lg sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card, index) => (
            <li key={card.id} className="min-w-0">
              <MenuItemResultCard
                index={index}
                item={card.data}
                onPress={() => navigate(`/customer/explore/items/${card.id}`)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </SearchLayout>
  );
}

/**
 * The search bar stays pinned at the top (on desktop the location and chips
 * stay with it); a thin painted kerb marks where the results begin. The AI
 * note, when on, sits right under the controls, never between results.
 */
function SearchLayout({
  query,
  setQuery,
  controls,
  header,
  children,
}: {
  query: string;
  setQuery: (value: string) => void;
  controls?: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <Screen padded={false}>
      <div className="sticky top-0 z-30 bg-bg/95 lg:bg-bg/85 lg:backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] items-center px-md py-sm md:px-lg lg:h-[88px] lg:px-xl lg:py-0">
          <div className="min-w-0 flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </div>
      </div>
      {controls ? (
        <div className="bg-bg lg:sticky lg:top-[88px] lg:z-20 lg:bg-bg/85 lg:backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-sm px-md pb-sm md:px-lg lg:px-xl">
            {controls}
          </div>
        </div>
      ) : null}
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="cq mx-auto flex max-w-[1320px] flex-col gap-lg px-md pb-2xl pt-lg md:px-lg lg:px-xl lg:pt-xl">
        {env.enableAiCompliance && query.length > 3 ? (
          <AiHint title="Hiểu theo ngôn ngữ tự nhiên">
            Đang tìm theo từ khoá &ldquo;{query}&rdquo; — kết quả bao gồm cả tên món, danh mục và
            tên quán liên quan.
          </AiHint>
        ) : null}
        {header}
        {children}
      </div>
    </Screen>
  );
}
