import { apiGet, apiPost } from './client';

/**
 * AI suggestions (AIP-01..04, AIB-01). Every answer is a suggestion for a person to accept or ignore:
 * nothing here saves, orders or decides. `available: false` is a normal answer (the feature is off,
 * the model is down or there is too little to go on), never an error to show as a failure.
 */

export type DishDescriptionSuggestion = {
  available: boolean;
  description: string | null;
  message: string;
  aiLogId: number | null;
};

export type ReferencePrice = { dishCount: number; lowest: number; median: number; highest: number };

export type DishRecognition = {
  available: boolean;
  recognized: boolean;
  dishName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  /** 0-100. */
  confidence: number | null;
  referencePrice: ReferencePrice | null;
  message: string;
  aiLogId: number | null;
};

export type SearchSort = 'name' | 'price_asc' | 'price_desc' | 'rating' | 'distance';

export type SearchIntent = {
  available: boolean;
  /** "AI" when the model read the sentence, "RULES" when the built-in keyword rules did. */
  source: 'AI' | 'RULES';
  query: string | null;
  categoryId: number | null;
  categoryName: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  openNow: boolean | null;
  minRating: number | null;
  nearMe: boolean;
  radiusMeters: number | null;
  sort: SearchSort | null;
  explanation: string;
};

export type ReviewSummary = {
  available: boolean;
  /** NOT_ENOUGH_REVIEWS, UNAVAILABLE or DISABLED when `available` is false. */
  reason: 'NOT_ENOUGH_REVIEWS' | 'UNAVAILABLE' | 'DISABLED' | null;
  reviewCount: number;
  requiredCount: number;
  summary: string | null;
  positives: string[];
  negatives: string[];
  generatedAt: string | null;
  disclaimer: string;
};

export type PermitPrecheck = {
  permitId: number;
  permitStatus: string | null;
  contractStatus: string | null;
  slotCode: string | null;
  validNow: boolean;
  slotMatchesReport: boolean;
};

export type VendorReportFlag =
  | 'NO_PHOTO'
  | 'NO_PERMIT_VISIBLE_IN_PHOTO'
  | 'SIGNAGE_DIFFERS_FROM_REGISTERED_NAME'
  | 'PERMIT_NOT_VALID'
  | 'PERMIT_SLOT_MISMATCH';

export type VendorReportAssist = {
  aiAvailable: boolean;
  signageText: string | null;
  locationText: string | null;
  permitVisible: 'YES' | 'NO' | 'UNCLEAR' | null;
  description: string | null;
  flags: VendorReportFlag[];
  permitCheck: PermitPrecheck | null;
  generatedAt: string | null;
  aiLogId: number | null;
  disclaimer: string;
};

export type WardVendorReportSummary = {
  reportId: number;
  reason: string;
  status: string;
  createdAt: string;
  vendorName: string | null;
  slotCode: string | null;
  hasPhoto: boolean;
};

export type WardVendorReport = {
  reportId: number;
  reason: string;
  evidenceUrl: string | null;
  status: string;
  createdAt: string;
  vendorName: string | null;
  slotCode: string | null;
  aiExtractedLocation: string | null;
  assist: VendorReportAssist;
};

export const aiApi = {
  /** AIP-01: a draft description from the dish name (and optionally the vendor's own uploaded photo). */
  dishDescription: (name: string, imageUrl?: string | null) =>
    apiPost<DishDescriptionSuggestion>('/ai/dish-description', {
      name,
      imageUrl: imageUrl ?? null,
    }),

  /** AIP-02: dish name, platform category and a reference price from the vendor's own dish photo. */
  dishRecognition: (imageUrl: string) =>
    apiPost<DishRecognition>('/ai/dish-recognition', { imageUrl }),

  /** AIP-03: a sentence turned into the marketplace's own filters. Open to guests. */
  searchIntent: (text: string) => apiPost<SearchIntent>('/ai/search-intent', { text }),

  /** AIP-04: what reviewers keep saying about one public storefront. Open to guests. */
  reviewSummary: (storefrontId: number) =>
    apiGet<ReviewSummary>(`/ai/storefronts/${storefrontId}/review-summary`),
};

export const wardVendorReportsApi = {
  list: (status?: string, page = 1) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return apiGet<WardVendorReportSummary[]>(`/ward/vendor-reports${query ? `?${query}` : ''}`);
  },
  get: (reportId: number) => apiGet<WardVendorReport>(`/ward/vendor-reports/${reportId}`),
  /** AIB-01: reads the photo again and returns the refreshed notes. */
  assist: (reportId: number) => apiPost<WardVendorReport>(`/ward/vendor-reports/${reportId}/assist`),
};
