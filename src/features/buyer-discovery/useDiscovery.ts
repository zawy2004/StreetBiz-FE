import { useQuery } from '@tanstack/react-query';

import { commerceApi, type MenuItemQuery, type StorefrontQuery } from '@/core/api/commerce-api';
import { useDiscoveryStore } from './discovery-store';

// These reads are public, so their keys carry no user id.

/** Wards that have listed storefronts, nearest first once the customer's position is known. */
export function useServiceAreas() {
  const position = useDiscoveryStore((s) => s.position);
  return useQuery({
    queryKey: ['commerce', 'service-areas', position],
    queryFn: () => commerceApi.serviceAreas(position ?? undefined),
    staleTime: 60_000,
  });
}

export function useMarketplaceCategories() {
  return useQuery({
    queryKey: ['commerce', 'marketplace-categories'],
    queryFn: commerceApi.marketplaceCategories,
    staleTime: 300_000,
  });
}

export function useStorefronts(query: StorefrontQuery, enabled = true) {
  return useQuery({
    queryKey: ['commerce', 'storefronts', query],
    queryFn: () => commerceApi.storefronts(query),
    enabled,
  });
}

export function useMenuItemSearch(query: MenuItemQuery, enabled = true) {
  return useQuery({
    queryKey: ['commerce', 'menu-search', query],
    queryFn: () => commerceApi.menuItems(query),
    enabled,
  });
}
