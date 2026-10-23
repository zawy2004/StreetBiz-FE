import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from './client';

export type SellerStore = {
  storefrontId: number;
  registrationId: number;
  contractId: number;
  name: string;
  description: string | null;
  availabilityStatus: string;
};
export type StoreInput = Omit<SellerStore, 'storefrontId'>;
/** Where a dish stands with ATTP; MISSING and PENDING dishes are not shown to buyers. */
export type DishFoodSafetyStatus = 'NOT_REQUIRED' | 'MISSING' | 'PENDING' | 'APPROVED';
export type SellerMenuItem = {
  menuItemId: number;
  storefrontId: number;
  categoryId: number;
  name: string;
  description: string | null;
  unitPrice: number;
  availabilityStatus: string;
  imageUrl: string | null;
  categoryName: string;
  requiresFoodSafety: boolean;
  foodSafetyStatus: DishFoodSafetyStatus;
  foodSafetyExpiresOn: string | null;
  /** Optional English name for the price board (typed by the vendor). */
  nameEn: string | null;
  /** The unit the price is for ("ổ", "ly", "kg"...): a posted price always names one (Luật Giá 2023, Điều 29). */
  priceUnit: string;
};
/** The stall's dishes plus how many it may sell at once. */
export type SellerMenu = { items: SellerMenuItem[]; maxItems: number };
export type MenuInput = {
  categoryId: number;
  name: string;
  description: string | null;
  unitPrice: number;
  availabilityStatus: string;
  /** From `uploadMenuImage`; required for a new dish, omit to keep the current photo. */
  imageUrl?: string | null;
  /** Required (1-30 characters): without it the server answers 422. */
  priceUnit: string;
  nameEn: string | null;
};

/** One dish on the board as buyers see it. */
export type PriceBoardItem = {
  menuItemId: number;
  name: string;
  nameEn: string | null;
  priceUnit: string;
  unitPrice: number;
};

export type PriceChangeKind = 'CREATED' | 'UPDATED' | 'ARCHIVED' | 'RESTORED';

/** One row of the append-only price history (MenuItemPriceHistory): the dish as it stood after the change. */
export type PriceHistoryEntry = {
  priceHistoryId: number;
  menuItemId: number;
  name: string;
  nameEn: string | null;
  priceUnit: string;
  unitPrice: number;
  /** The dish's price on its previous row; null for its first row. */
  previousUnitPrice: number | null;
  isListed: boolean;
  changeKind: PriceChangeKind;
  changedAt: string;
  changedByName: string;
};

/**
 * BUY-06: the stall's price board. `version` is "Bản số N" (grows with every change);
 * `qrUrl` (`/q/{token}?v=N`) and `printUrl` (`/q/{token}/print`) wrap the permit's own signed
 * token and are null without a live permit or without the server's public base URL.
 */
export type SellerPriceBoard = {
  storefrontId: number;
  storefrontName: string;
  slotCode: string | null;
  version: number;
  updatedAt: string | null;
  qrUrl: string | null;
  printUrl: string | null;
  items: PriceBoardItem[];
  /** The latest 50 changes, newest first. */
  history: PriceHistoryEntry[];
};
export type SellerCategory = { categoryId: number; name: string; requiresFoodSafety: boolean };
export type RentalChoice = {
  contractId: number;
  applicationId: number;
  slotCode: string;
  startDate: string;
  endDate: string;
  contractStatus: string;
};
export type ApplicationChoice = { applicationId: number; registrationId: number };

/** One weekly opening window: ISO weekday (Monday = 1) and "HH:mm" times. */
export type BusinessHour = { dayOfWeek: number; opensAt: string; closesAt: string };
/** The hours the ward rents the pitch for; `overnight` when it runs past midnight (from is later than to). */
export type RentalWindow = { from: string; to: string; overnight: boolean };
export type StoreHours = {
  storefrontId: number;
  hours: BusinessHour[];
  allowedWindow: RentalWindow | null;
  availabilityStatus: string;
  /** Open right now: the switch is on and the hours (if any) cover this minute, Da Nang time. */
  isOpenNow: boolean;
};

export const sellerStoreApi = {
  stores: () => apiGet<SellerStore[]>('/seller/storefronts'),
  saveStore: (id: number | null, input: StoreInput) =>
    id === null
      ? apiPost<SellerStore>('/seller/storefronts', input)
      : apiPut<SellerStore>(`/seller/storefronts/${id}`, input),
  hours: (id: number) => apiGet<StoreHours>(`/seller/storefronts/${id}/business-hours`),
  /** Replaces the whole week; an empty list clears it. */
  saveHours: (id: number, hours: BusinessHour[]) =>
    apiPut<StoreHours>(`/seller/storefronts/${id}/business-hours`, { hours }),
  categories: () => apiGet<SellerCategory[]>('/seller/storefronts/food-categories'),
  menu: (id: number) => apiGet<SellerMenu>(`/seller/storefronts/${id}/menu-items`),
  /** Stores a dish photo (public) and returns the URL to send as `imageUrl`. */
  uploadMenuImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiUpload<{ fileUrl: string }>('/uploads/menu-images', form);
  },
  saveItem: (storeId: number, id: number | null, input: MenuInput) =>
    id === null
      ? apiPost<SellerMenuItem>(`/seller/storefronts/${storeId}/menu-items`, input)
      : apiPut<SellerMenuItem>(`/seller/storefronts/${storeId}/menu-items/${id}`, input),
  archiveItem: (storeId: number, id: number) =>
    apiDelete<void>(`/seller/storefronts/${storeId}/menu-items/${id}`),
  /** BUY-06: the board as it stands, its version, the public links and the latest 50 changes. */
  priceBoard: (storeId: number) =>
    apiGet<SellerPriceBoard>(`/seller/storefronts/${storeId}/price-board`),
  contracts: () => apiGet<RentalChoice[]>('/vendor/rental-contracts?status=ACTIVE'),
  applications: () => apiGet<ApplicationChoice[]>('/vendor/rental-applications'),
};
