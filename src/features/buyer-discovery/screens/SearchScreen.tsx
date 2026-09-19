import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Card, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { AiHint } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';

export function SearchScreen() {
  return isLiveApi ? <LiveSearchScreen /> : <MockSearchScreen />;
}

function LiveSearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const normalized = query.trim();
  const results = useQuery({
    queryKey: ['commerce', 'menu-search', normalized],
    queryFn: () => commerceApi.menuItems(normalized),
    enabled: normalized.length > 0,
  });

  return (
    <SearchLayout query={query} setQuery={setQuery}>
      {results.isPending && normalized ? <LoadingState /> : null}
      {results.isError ? (
        <ErrorState message={errorMessage(results.error)} onRetry={() => results.refetch()} />
      ) : null}
      {normalized && results.data?.length === 0 ? (
        <EmptyState icon="magnify" title="Không tìm thấy kết quả" />
      ) : null}
      {results.data?.map((item) => (
        <Card
          key={item.menuItemId}
          onPress={() => navigate(`/customer/explore/items/${item.menuItemId}`)}
        >
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
  children,
}: {
  query: string;
  setQuery: (value: string) => void;
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
