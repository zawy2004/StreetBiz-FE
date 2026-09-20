import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { errorMessage } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMockDb } from '@/mocks/db';
import { FilterBar } from '../components/FilterBar';
import { LocationBar } from '../components/LocationBar';
import { StorefrontCard } from '../components/StorefrontCard';
import {
  hasActiveFilters,
  menuItemQuery,
  menuSortFor,
  storefrontQuery,
  storefrontSortFor,
  type SearchSort,
} from '../discovery-filters';
import { useDiscoveryStore } from '../discovery-store';
import { useMenuItemSearch, useStorefronts } from '../useDiscovery';

export function SearchScreen() {
  return isLiveApi ? <LiveSearchScreen /> : <MockSearchScreen />;
}

function LiveSearchScreen() {
  const navigate = useNavigate();
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
  const sorts: { value: SearchSort; label: string }[] = [
    ...(position ? [{ value: 'NEAREST' as const, label: 'Gần nhất' }] : []),
    { value: 'NAME', label: 'Tên' },
    { value: 'RATING', label: 'Đánh giá' },
    { value: 'PRICE_ASC', label: 'Giá thấp' },
    { value: 'PRICE_DESC', label: 'Giá cao' },
  ];
  const nothingFound =
    storefronts.isSuccess && items.isSuccess && storefronts.data.length === 0 && items.data.length === 0;

  return (
    <SearchLayout
      query={query}
      setQuery={setQuery}
      controls={
        <>
          <LocationBar />
          <FilterBar showRadius={position != null} showPrice />
          <SegmentedControl options={sorts} value={effectiveSort} onChange={setSort} />
        </>
      }
    >
      {active && (storefronts.isPending || items.isPending) ? <LoadingState /> : null}
      {storefronts.isError ? (
        <ErrorState message={errorMessage(storefronts.error)} onRetry={() => storefronts.refetch()} />
      ) : null}
      {items.isError ? <ErrorState message={errorMessage(items.error)} onRetry={() => items.refetch()} /> : null}
      {nothingFound ? <EmptyState icon="magnify" title="Không tìm thấy kết quả" /> : null}
      {storefronts.data && storefronts.data.length > 0 ? (
        <Section title={`Quán (${storefronts.data.length})`}>
          {storefronts.data.map((storefront) => (
            <StorefrontCard
              key={storefront.storefrontId}
              storefront={storefront}
              onPress={() => navigate(`/customer/explore/stores/${storefront.storefrontId}`)}
            />
          ))}
        </Section>
      ) : null}
      {items.data && items.data.length > 0 ? (
        <Section title={`Món (${items.data.length})`}>
          {items.data.map((item) => (
            <Card key={item.menuItemId} onPress={() => navigate(`/customer/explore/items/${item.menuItemId}`)}>
              <div className="flex items-center justify-between gap-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-headline-sm text-text">{item.itemName}</p>
                  <p className="text-body-sm text-muted">
                    {item.storefrontName} · {item.categoryName}
                  </p>
                </div>
                <Money amountVnd={item.unitPrice} />
              </div>
            </Card>
          ))}
        </Section>
      ) : null}
    </SearchLayout>
  );
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

  return (
    <SearchLayout query={query} setQuery={setQuery}>
      {query && results.length === 0 ? (
        <EmptyState icon="magnify" title="Không tìm thấy kết quả" />
      ) : null}
      {results.map((item) => {
        const storefront = storefronts.find((row) => row.id === item.storefrontId);
        return (
          <Card key={item.id} onPress={() => navigate(`/customer/explore/items/${item.id}`)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-headline-sm text-text">{item.name}</p>
                <p className="text-body-sm text-muted">{storefront?.name}</p>
              </div>
              <Money amountVnd={item.price} />
            </div>
          </Card>
        );
      })}
    </SearchLayout>
  );
}

function SearchLayout({
  query,
  setQuery,
  controls,
  children,
}: {
  query: string;
  setQuery: (value: string) => void;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Screen>
      <AppHeader title="Tìm kiếm" back />
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm món ăn hoặc quán, VD: xôi gà giá rẻ"
        autoFocus
      />
      {controls}
      {env.enableAiCompliance && query.length > 3 ? (
        <AiHint title="Hiểu theo ngôn ngữ tự nhiên">
          Đang tìm theo từ khoá &ldquo;{query}&rdquo; — kết quả bao gồm cả tên món, danh mục và tên
          quán liên quan.
        </AiHint>
      ) : null}
      {children}
    </Screen>
  );
}
