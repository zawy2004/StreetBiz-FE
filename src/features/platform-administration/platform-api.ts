import { apiDelete, apiGet, apiPost, apiPut } from '@/core/api';

export type PlatformAdminProfile = { userId: number; name: string };

export type FoodCategory = {
  categoryId: number;
  categoryName: string;
  itemCount: number;
  createdByName: string | null;
};

export type ReportedContent = {
  reportId: number;
  contentType: string;
  contentId: number;
  contentTitle: string;
  contentBody: string | null;
  contentStatus: string;
  contentExists: boolean;
  reporterName: string;
  reason: string;
  status: string;
  reviewedByName: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type OrderComplaint = {
  complaintId: number;
  orderId: number;
  orderCode: string;
  orderStatus: string;
  customerName: string;
  storefrontName: string;
  complaintType: string;
  description: string;
  requestedRefundAmount: number | null;
  status: string;
  resolutionNotes: string | null;
  resolvedByName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  paymentAmount: number | null;
  paymentProvider: string | null;
  refundedAmount: number;
  latestRefundId: number | null;
  latestRefundStatus: string | null;
};

export type PlatformPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

/**
 * Admin calls go through the shared axios client (`@/core/api`), so they carry
 * the signed-in user's bearer, share the refresh-and-retry, and map RFC 7807
 * problems to `ApiError` like every other module. There is no second sign-in:
 * `/platform/*` already sits behind `RoleShell role="PLATFORM_ADMIN"`, and
 * `PlatformGate` only asks the backend to confirm the account (`/platform/me`).
 *
 * `PlatformApiError` is kept as a name for the screens' error checks.
 */
export { ApiError as PlatformApiError } from '@/core/api';

const qs = (status?: string) => (status ? `?status=${encodeURIComponent(status)}` : '');

export const platformApi = {
  me: () => apiGet<PlatformAdminProfile>('/platform/me'),
  categories: () => apiGet<FoodCategory[]>('/platform/food-categories'),
  createCategory: (name: string) => apiPost<FoodCategory>('/platform/food-categories', { name }),
  renameCategory: (categoryId: number, name: string) =>
    apiPut<FoodCategory>(`/platform/food-categories/${categoryId}`, { name }),
  deleteCategory: (categoryId: number) =>
    apiDelete<void>(`/platform/food-categories/${categoryId}`),
  reportedContent: (status?: string) =>
    apiGet<PlatformPage<ReportedContent>>(`/platform/reported-content${qs(status)}`),
  reportedContentDetail: (reportId: string | number) =>
    apiGet<ReportedContent>(`/platform/reported-content/${encodeURIComponent(reportId)}`),
  decideReportedContent: (
    reportId: string | number,
    decision: 'dismiss' | 'hide',
    expectedStatus: string,
  ) =>
    apiPost<ReportedContent>(
      `/platform/reported-content/${encodeURIComponent(reportId)}/${decision}`,
      { expectedStatus },
    ),
  complaints: (status?: string) =>
    apiGet<PlatformPage<OrderComplaint>>(`/platform/order-complaints${qs(status)}`),
  complaintDetail: (complaintId: string | number) =>
    apiGet<OrderComplaint>(`/platform/order-complaints/${encodeURIComponent(complaintId)}`),
  decideComplaint: (
    complaintId: string | number,
    request: {
      decision: 'RESOLVE' | 'REJECT';
      notes: string;
      expectedStatus: string;
      approvedRefundAmount?: number;
    },
  ) =>
    apiPost<OrderComplaint>(
      `/platform/order-complaints/${encodeURIComponent(complaintId)}/decision`,
      request,
    ),
};
