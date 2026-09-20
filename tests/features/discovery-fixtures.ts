import type { MarketplaceMenuItem, StorefrontSummary } from '@/core/api/commerce-api';

export function makeStorefront(overrides: Partial<StorefrontSummary> = {}): StorefrontSummary {
  return {
    storefrontId: 1,
    storefrontName: 'Bún chả Hải Châu',
    description: 'Bún chả nướng than.',
    imageUrl: null,
    vendorId: 10002,
    address: null,
    wardId: 1003,
    wardName: 'Phường Nam Dương',
    zoneName: 'Đường Nguyễn Văn Linh',
    slotCode: 'NVL-14',
    latitude: 16.060169,
    longitude: 108.214204,
    distanceMeters: null,
    isOpenNow: true,
    todayHours: [{ dayOfWeek: 6, opensAt: '10:00', closesAt: '21:00' }],
    communityRating: 4.5,
    communityCount: 3,
    menuItemCount: 5,
    minPrice: 12_000,
    categories: ['Bún - Phở - Mì', 'Đồ uống'],
    ...overrides,
  };
}

export function makeMenuItem(overrides: Partial<MarketplaceMenuItem> = {}): MarketplaceMenuItem {
  return {
    menuItemId: 20,
    storefrontId: 1,
    storefrontName: 'Bún chả Hải Châu',
    itemName: 'Bún chả',
    description: 'Chả nướng than hoa.',
    imageUrl: null,
    unitPrice: 45_000,
    availabilityStatus: 'AVAILABLE',
    categoryId: 1,
    categoryName: 'Bún - Phở - Mì',
    ...overrides,
  };
}
