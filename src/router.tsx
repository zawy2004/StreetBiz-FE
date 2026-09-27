import { Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { AuthGuard, RoleGuard } from '@/core/auth/RoleGuard';
import { useAuthStore } from '@/store/auth-store';
import { LandingScreen } from '@/features/landing/screens';
import { RoleShell } from '@/layouts/RoleShell';
import { VendorTopBar } from '@/layouts/VendorTopBar';
import { CUSTOMER_TABS, PLATFORM_TABS, VENDOR_TABS, WARD_TABS } from '@/layouts/role-tabs';
import { lazyScreen } from '@/core/routing/lazy-screen';
import { ScreenFallback } from '@/core/routing/ScreenFallback';

import {
  RegisterScreen,
  ResetPasswordRequestScreen,
  ResetPasswordScreen,
  SignInScreen,
  VerifyPhoneScreen,
} from '@/features/authentication/screens';

// Everything past sign-in is split per feature and fetched on first visit.
const WardCasesScreen = lazyScreen(
  () => import('@/features/ward-administration/screens/WardCasesScreen'),
  'WardCasesScreen',
);
const WardCaseScreen = lazyScreen(
  () => import('@/features/ward-administration/screens/WardCaseScreen'),
  'WardCaseScreen',
);
const AccountScreen = lazyScreen(
  () => import('@/features/account-management/screens'),
  'AccountScreen',
);
const ChangePasswordScreen = lazyScreen(
  () => import('@/features/account-management/screens'),
  'ChangePasswordScreen',
);
const NotificationsScreen = lazyScreen(
  () => import('@/features/account-management/screens'),
  'NotificationsScreen',
);
const SessionsScreen = lazyScreen(
  () => import('@/features/account-management/screens'),
  'SessionsScreen',
);
const VendorHomeScreen = lazyScreen(
  () => import('@/features/vendor-home/screens/VendorHomeScreen'),
  'VendorHomeScreen',
);
const VendorAssistantScreen = lazyScreen(
  () => import('@/features/ai-compliance/screens/VendorAssistantScreen'),
  'VendorAssistantScreen',
);
const AddressUpdateScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'AddressUpdateScreen',
);
const AdjacentSlotScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'AdjacentSlotScreen',
);
const NewRegistrationDetailsScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'NewRegistrationDetailsScreen',
);
const NewRegistrationEvidenceScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'NewRegistrationEvidenceScreen',
);
const NewRegistrationOwnerScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'NewRegistrationOwnerScreen',
);
const NewRegistrationTypeScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'NewRegistrationTypeScreen',
);
const RegistrationDetailScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'RegistrationDetailScreen',
);
const RegistrationsListScreen = lazyScreen(
  () => import('@/features/business-registrations/screens'),
  'RegistrationsListScreen',
);
const RentalApplicationDetailScreen = lazyScreen(
  () => import('@/features/sidewalk-slots/screens'),
  'RentalApplicationDetailScreen',
);
const MySlotsScreen = lazyScreen(
  () => import('@/features/sidewalk-slots/screens'),
  'MySlotsScreen',
);
const RentalApplicationsScreen = lazyScreen(
  () => import('@/features/sidewalk-slots/screens'),
  'RentalApplicationsScreen',
);
const SlotDetailScreen = lazyScreen(
  () => import('@/features/sidewalk-slots/screens'),
  'SlotDetailScreen',
);
const SlotMapScreen = lazyScreen(
  () => import('@/features/sidewalk-slots/screens'),
  'SlotMapScreen',
);
const SlotProposalScreen = lazyScreen(
  () => import('@/features/sidewalk-slots/screens'),
  'SlotProposalScreen',
);
const AcceptTransferScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'AcceptTransferScreen',
);
const ContractDetailScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'ContractDetailScreen',
);
const ContractsListScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'ContractsListScreen',
);
const DigitalPermitScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'DigitalPermitScreen',
);
const RenewalRequestScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'RenewalRequestScreen',
);
const ReturnSlotScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'ReturnSlotScreen',
);
const TransferInitiateScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'TransferInitiateScreen',
);
const TransfersListScreen = lazyScreen(
  () => import('@/features/rental-contracts/screens'),
  'TransfersListScreen',
);
const FeePaymentScreen = lazyScreen(
  () => import('@/features/fee-schedules/screens'),
  'FeePaymentScreen',
);
const FinanceHomeScreen = lazyScreen(
  () => import('@/features/fee-schedules/screens'),
  'FinanceHomeScreen',
);
const InvoiceDetailScreen = lazyScreen(
  () => import('@/features/fee-schedules/screens'),
  'InvoiceDetailScreen',
);
const InvoicesListScreen = lazyScreen(
  () => import('@/features/fee-schedules/screens'),
  'InvoicesListScreen',
);
const PaymentHistoryScreen = lazyScreen(
  () => import('@/features/fee-schedules/screens'),
  'PaymentHistoryScreen',
);
const PenaltyPaymentScreen = lazyScreen(
  () => import('@/features/fee-schedules/screens'),
  'PenaltyPaymentScreen',
);
const VendorViolationsScreen = lazyScreen(
  () => import('@/features/fee-schedules/screens'),
  'VendorViolationsScreen',
);
const MenuScreen = lazyScreen(() => import('@/features/storefronts/screens'), 'MenuScreen');
const SalesSummaryScreen = lazyScreen(
  () => import('@/features/storefronts/screens'),
  'SalesSummaryScreen',
);
const StoreScreen = lazyScreen(() => import('@/features/storefronts/screens'), 'StoreScreen');
const VendorOrdersScreen = lazyScreen(
  () => import('@/features/storefronts/screens'),
  'VendorOrdersScreen',
);
const CommentFormScreen = lazyScreen(
  () => import('@/features/vendor-map/screens'),
  'CommentFormScreen',
);
const ExploreScreen = lazyScreen(() => import('@/features/vendor-map/screens'), 'ExploreScreen');
const PublicScanScreen = lazyScreen(
  () => import('@/features/vendor-map/screens'),
  'PublicScanScreen',
);
const VendorProfileScreen = lazyScreen(
  () => import('@/features/vendor-map/screens'),
  'VendorProfileScreen',
);
const ReportContentScreen = lazyScreen(
  () => import('@/features/vendor-reports/screens'),
  'ReportContentScreen',
);
const VendorReportFormScreen = lazyScreen(
  () => import('@/features/vendor-reports/screens'),
  'VendorReportFormScreen',
);
const ItemDetailScreen = lazyScreen(
  () => import('@/features/buyer-discovery/screens'),
  'ItemDetailScreen',
);
const SearchScreen = lazyScreen(() => import('@/features/buyer-discovery/screens'), 'SearchScreen');
const StorefrontDetailScreen = lazyScreen(
  () => import('@/features/buyer-discovery/screens'),
  'StorefrontDetailScreen',
);
const CartScreen = lazyScreen(() => import('@/features/cart/screens'), 'CartScreen');
const CheckoutScreen = lazyScreen(() => import('@/features/cart/screens'), 'CheckoutScreen');
const OrderPaymentScreen = lazyScreen(
  () => import('@/features/orders/screens/OrderPaymentScreen'),
  'OrderPaymentScreen',
);
const CustomerOrdersScreen = lazyScreen(
  () => import('@/features/orders/screens'),
  'CustomerOrdersScreen',
);
const OrderComplaintScreen = lazyScreen(
  () => import('@/features/orders/screens'),
  'OrderComplaintScreen',
);
const OrderDetailScreen = lazyScreen(
  () => import('@/features/orders/screens'),
  'OrderDetailScreen',
);
const OrderReviewScreen = lazyScreen(
  () => import('@/features/orders/screens'),
  'OrderReviewScreen',
);
const VendorOrderDetailScreen = lazyScreen(
  () => import('@/features/orders/screens'),
  'VendorOrderDetailScreen',
);
const AddressConflictReviewScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'AddressConflictReviewScreen',
);
const CollectionReportScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'CollectionReportScreen',
);
const InboxScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'InboxScreen',
);
const PenaltyScheduleScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'PenaltyScheduleScreen',
);
const PermitActionScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'PermitActionScreen',
);
const PermitScanScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'PermitScanScreen',
);
const PricingScheduleScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'PricingScheduleScreen',
);
const RecordViolationScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'RecordViolationScreen',
);
const RegistrationReviewScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'RegistrationReviewScreen',
);
const RentalApplicationReviewScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'RentalApplicationReviewScreen',
);
const RenewalReviewScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'RenewalReviewScreen',
);
const SlotGridEditorScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'SlotGridEditorScreen',
);
const SlotOccupancyScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'SlotOccupancyScreen',
);
const SlotProposalReviewScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'SlotProposalReviewScreen',
);
const SlotTransferReviewScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'SlotTransferReviewScreen',
);
const VendorReportReviewScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'VendorReportReviewScreen',
);
const WardDashboardScreen = lazyScreen(
  () => import('@/features/ward-administration/screens'),
  'WardDashboardScreen',
);
const AccountsScreen = lazyScreen(
  () => import('@/features/platform-administration/screens'),
  'AccountsScreen',
);
const CategoriesScreen = lazyScreen(
  () => import('@/features/platform-administration/screens'),
  'CategoriesScreen',
);
const ModerationScreen = lazyScreen(
  () => import('@/features/platform-administration/screens'),
  'ModerationScreen',
);
const ReportedContentReviewScreen = lazyScreen(
  () => import('@/features/platform-administration/screens'),
  'ReportedContentReviewScreen',
);
const OrderComplaintReviewScreen = lazyScreen(
  () => import('@/features/platform-administration/screens'),
  'OrderComplaintReviewScreen',
);
const PlatformDashboardScreen = lazyScreen(
  () => import('@/features/platform-administration/screens'),
  'PlatformDashboardScreen',
);

/** Guests land on the public landing page; signed-in users go straight to their role home. */
function IndexRoute() {
  const user = useAuthStore((s) => s.user);
  return user ? <Navigate to={ROLE_HOME_ROUTE[user.role_code]} replace /> : <LandingScreen />;
}

function NotFoundScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg text-body-lg text-muted">
      Không tìm thấy trang.
    </div>
  );
}

function LegacyWardReviewRedirect() {
  const { kind, id } = useParams();
  const suffix = kind && id ? `/${kind}/${id}` : '';
  return <Navigate to={`/ward/inbox/reviews${suffix}`} replace />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        <Route path="/" element={<IndexRoute />} />
        <Route path="/ward-reviews" element={<LegacyWardReviewRedirect />} />
        <Route path="/ward-reviews/:kind/:id" element={<LegacyWardReviewRedirect />} />

        <Route path="/auth/sign-in" element={<SignInScreen />} />
        <Route path="/auth/register" element={<RegisterScreen />} />
        <Route path="/auth/verify-phone" element={<VerifyPhoneScreen />} />
        <Route path="/auth/password/reset-request" element={<ResetPasswordRequestScreen />} />
        <Route path="/auth/password/reset" element={<ResetPasswordScreen />} />

        <Route
          path="/account"
          element={
            <AuthGuard>
              <AccountScreen />
            </AuthGuard>
          }
        />
        <Route
          path="/account/password"
          element={
            <AuthGuard>
              <ChangePasswordScreen />
            </AuthGuard>
          }
        />
        <Route
          path="/account/sessions"
          element={
            <AuthGuard>
              <SessionsScreen />
            </AuthGuard>
          }
        />
        <Route
          path="/account/notifications"
          element={
            <AuthGuard>
              <NotificationsScreen />
            </AuthGuard>
          }
        />

        <Route
          path="/orders"
          element={
            <RoleGuard role="CUSTOMER">
              <CustomerOrdersScreen />
            </RoleGuard>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <RoleGuard role="CUSTOMER">
              <OrderDetailScreen />
            </RoleGuard>
          }
        />

        <Route
          path="/customer"
          element={
            <RoleShell
              role="CUSTOMER"
              allowGuest
              roleLabel="Người mua"
              items={CUSTOMER_TABS}
              navigation="topnav"
            />
          }
        >
          <Route path="explore" element={<ExploreScreen />} />
          <Route path="explore/search" element={<SearchScreen />} />
          <Route path="explore/cart" element={<CartScreen />} />
          <Route path="explore/report-content" element={<ReportContentScreen />} />
          <Route path="explore/vendors/:vendorId" element={<VendorProfileScreen />} />
          <Route path="explore/vendors/:vendorId/comments/new" element={<CommentFormScreen />} />
          <Route
            path="explore/vendors/:vendorId/reports/new"
            element={<VendorReportFormScreen />}
          />
          <Route path="explore/items/:itemId" element={<ItemDetailScreen />} />
          <Route path="explore/stores/:storefrontId" element={<StorefrontDetailScreen />} />
          <Route path="scan" element={<PublicScanScreen />} />
          <Route path="checkout" element={<CheckoutScreen />} />
          <Route path="account" element={<AccountScreen />} />
          <Route path="orders" element={<CustomerOrdersScreen />} />
          <Route path="orders/:orderId" element={<OrderDetailScreen />} />
          <Route path="orders/:orderId/payment" element={<OrderPaymentScreen />} />
          <Route path="orders/:orderId/review" element={<OrderReviewScreen />} />
          <Route path="orders/:orderId/complaint" element={<OrderComplaintScreen />} />
        </Route>

        <Route
          path="/vendor"
          element={
            <RoleShell
              role="VENDOR"
              roleLabel="Hộ kinh doanh"
              items={VENDOR_TABS}
              header={<VendorTopBar />}
            />
          }
        >
          <Route path="home" element={<VendorHomeScreen />} />
          <Route path="account" element={<AccountScreen />} />
          <Route path="assistant" element={<VendorAssistantScreen />} />
          <Route path="registrations" element={<RegistrationsListScreen />} />
          <Route path="registrations/new/type" element={<NewRegistrationTypeScreen />} />
          <Route path="registrations/new/details" element={<NewRegistrationDetailsScreen />} />
          <Route path="registrations/new/owner" element={<NewRegistrationOwnerScreen />} />
          <Route path="registrations/new/evidence" element={<NewRegistrationEvidenceScreen />} />
          <Route path="registrations/:id" element={<RegistrationDetailScreen />} />
          <Route path="registrations/:id/address" element={<AddressUpdateScreen />} />
          <Route path="registrations/:id/adjacent-slot" element={<AdjacentSlotScreen />} />
          <Route path="slots" element={<SlotMapScreen />} />
          <Route path="slots/:slotId" element={<SlotDetailScreen />} />
          <Route path="slots/mine" element={<MySlotsScreen />} />
          <Route path="slots/rental-applications" element={<RentalApplicationsScreen />} />
          <Route path="slots/rental-applications/:id" element={<RentalApplicationDetailScreen />} />
          <Route path="slots/slot-proposals/new" element={<SlotProposalScreen />} />
          <Route path="slots/contracts" element={<ContractsListScreen />} />
          <Route path="slots/contracts/:id" element={<ContractDetailScreen />} />
          <Route path="slots/contracts/:id/permit" element={<DigitalPermitScreen />} />
          <Route path="slots/contracts/:id/renewal" element={<RenewalRequestScreen />} />
          <Route path="slots/contracts/:id/return" element={<ReturnSlotScreen />} />
          <Route path="slots/contracts/:id/transfer" element={<TransferInitiateScreen />} />
          <Route path="slots/transfers" element={<TransfersListScreen />} />
          <Route path="slots/transfers/:id/accept" element={<AcceptTransferScreen />} />
          <Route path="finance" element={<FinanceHomeScreen />} />
          <Route path="finance/fees/:id/payment" element={<FeePaymentScreen />} />
          <Route path="finance/penalties/:id/payment" element={<PenaltyPaymentScreen />} />
          <Route path="finance/invoices" element={<InvoicesListScreen />} />
          <Route path="finance/invoices/:id" element={<InvoiceDetailScreen />} />
          <Route path="finance/payments" element={<PaymentHistoryScreen />} />
          <Route path="finance/violations" element={<VendorViolationsScreen />} />
          <Route path="store" element={<StoreScreen />} />
          <Route path="store/menu" element={<MenuScreen />} />
          <Route path="store/orders" element={<VendorOrdersScreen />} />
          <Route path="store/sales" element={<SalesSummaryScreen />} />
          <Route path="orders" element={<VendorOrdersScreen />} />
          <Route path="orders/sales-summary" element={<SalesSummaryScreen />} />
          <Route path="orders/:orderId" element={<VendorOrderDetailScreen />} />
        </Route>

        <Route
          path="/ward"
          element={<RoleShell role="WARD_AUTHORITY" roleLabel="Cán bộ Phường" items={WARD_TABS} />}
        >
          <Route path="dashboard" element={<WardDashboardScreen />} />
          <Route path="reports" element={<CollectionReportScreen />} />
          <Route path="inbox" element={<InboxScreen />} />
          <Route path="inbox/reviews" element={<WardCasesScreen />} />
          <Route path="inbox/reviews/:kind/:id" element={<WardCaseScreen />} />
          <Route path="inbox/registrations/:id" element={<RegistrationReviewScreen />} />
          <Route path="inbox/rental-applications/:id" element={<RentalApplicationReviewScreen />} />
          <Route path="inbox/renewals/:id" element={<RenewalReviewScreen />} />
          <Route path="inbox/slot-proposals/:id" element={<SlotProposalReviewScreen />} />
          <Route path="inbox/slot-transfers/:id" element={<SlotTransferReviewScreen />} />
          <Route path="inbox/address-conflicts/:id" element={<AddressConflictReviewScreen />} />
          <Route path="inbox/vendor-reports/:id" element={<VendorReportReviewScreen />} />
          <Route path="slots" element={<SlotOccupancyScreen />} />
          <Route path="slots/editor" element={<SlotGridEditorScreen />} />
          <Route path="patrol" element={<PermitScanScreen />} />
          <Route path="patrol/violations/new" element={<RecordViolationScreen />} />
          <Route path="patrol/permits/:permitId/action" element={<PermitActionScreen />} />
          <Route path="settings/pricing" element={<PricingScheduleScreen />} />
          <Route path="settings/penalties" element={<PenaltyScheduleScreen />} />
        </Route>

        <Route
          path="/platform"
          element={
            <RoleShell role="PLATFORM_ADMIN" roleLabel="Quản trị viên" items={PLATFORM_TABS} />
          }
        >
          <Route path="dashboard" element={<PlatformDashboardScreen />} />
          <Route path="accounts" element={<AccountsScreen />} />
          <Route path="categories" element={<CategoriesScreen />} />
          <Route path="moderation" element={<ModerationScreen />} />
          <Route path="moderation/content/:reportId" element={<ReportedContentReviewScreen />} />
          <Route
            path="moderation/complaints/:complaintId"
            element={<OrderComplaintReviewScreen />}
          />
        </Route>

        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </Suspense>
  );
}
