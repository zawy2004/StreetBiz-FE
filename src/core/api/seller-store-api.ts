import { apiDelete, apiGet, apiPost, apiPut } from './client';

export type SellerStore = {
  storefrontId: number;
  registrationId: number;
  contractId: number;
  name: string;
  description: string | null;
  availabilityStatus: string;
};
export type StoreInput = Omit<SellerStore, 'storefrontId'>;
export type SellerMenuItem = {
  menuItemId: number;
  storefrontId: number;
  categoryId: number;
  name: string;
  description: string | null;
  unitPrice: number;
  availabilityStatus: string;
};
export type MenuInput = Omit<SellerMenuItem, 'menuItemId' | 'storefrontId'>;
export type RentalChoice = {
  contractId: number;
  applicationId: number;
  slotCode: string;
  startDate: string;
  endDate: string;
  contractStatus: string;
};
export type ApplicationChoice = { applicationId: number; registrationId: number };

export const sellerStoreApi = {
  stores: () => apiGet<SellerStore[]>('/seller/storefronts'),
  saveStore: (id: number | null, input: StoreInput) =>
    id === null
      ? apiPost<SellerStore>('/seller/storefronts', input)
      : apiPut<SellerStore>(`/seller/storefronts/${id}`, input),
  categories: () =>
    apiGet<{ categoryId: number; name: string }[]>('/seller/storefronts/food-categories'),
  menu: (id: number) => apiGet<SellerMenuItem[]>(`/seller/storefronts/${id}/menu-items`),
  saveItem: (storeId: number, id: number | null, input: MenuInput) =>
    id === null
      ? apiPost<SellerMenuItem>(`/seller/storefronts/${storeId}/menu-items`, input)
      : apiPut<SellerMenuItem>(`/seller/storefronts/${storeId}/menu-items/${id}`, input),
  archiveItem: (storeId: number, id: number) =>
    apiDelete<void>(`/seller/storefronts/${storeId}/menu-items/${id}`),
  contracts: () => apiGet<RentalChoice[]>('/vendor/rental-contracts?status=ACTIVE'),
  applications: () => apiGet<ApplicationChoice[]>('/vendor/rental-applications'),
};
