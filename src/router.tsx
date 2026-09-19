import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { GUEST_HOME_ROUTE, ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { AuthGuard } from '@/core/auth/RoleGuard';
import { useAuthStore } from '@/store/auth-store';
import { WardCasesScreen } from '@/features/ward-administration/screens/WardCasesScreen';
import { WardCaseScreen } from '@/features/ward-administration/screens/WardCaseScreen';
import { RoleShell } from '@/layouts/RoleShell';
import { VendorTopBar } from '@/layouts/VendorTopBar';
import { CUSTOMER_TABS, PLATFORM_TABS, VENDOR_TABS, WARD_TABS } from '@/layouts/role-tabs';

import {
  RegisterScreen,
  ResetPasswordRequestScreen,
  ResetPasswordScreen,
  SignInScreen,
  VerifyPhoneScreen,
} from '@/features/authentication/screens';
import {
  AccountScreen,
  ChangePasswordScreen,
  NotificationsScreen,
  SessionsScreen,
} from '@/features/account-management/screens';

import { VendorHomeScreen } from '@/features/vendor-home/screens/VendorHomeScreen';
import { VendorAssistantScreen } from '@/features/ai-compliance/screens/VendorAssistantScreen';
import {
  AddressUpdateScreen,
  AdjacentSlotScreen,
  NewRegistrationDetailsScreen,
  NewRegistrationEvidenceScreen,
  NewRegistrationTypeScreen,
  RegistrationDetailScreen,
  RegistrationsListScreen,
} from '@/features/business-registrations/screens';
import {
  RentalApplicationDetailScreen,
  MySlotsScreen,
  RentalApplicationsScreen,
  SlotDetailScreen,
  SlotMapScreen,
  SlotProposalScreen,
} from '@/features/sidewalk-slots/screens';
import {
  AcceptTransferScreen,
  ContractDetailScreen,
  ContractsListScreen,
  DigitalPermitScreen,
  RenewalRequestScreen,
  ReturnSlotScreen,
  TransferInitiateScreen,
  TransfersListScreen,
} from '@/features/rental-contracts/screens';
import {
  FeePaymentScreen,
  FinanceHomeScreen,
  InvoiceDetailScreen,
  InvoicesListScreen,
  PaymentHistoryScreen,
  PenaltyPaymentScreen,
  VendorViolationsScreen,
} from '@/features/fee-schedules/screens';
import {
  MenuScreen,
  SalesSummaryScreen,
  StoreScreen,
  VendorOrdersScreen,
} from '@/features/storefronts/screens';

import {
  CommentFormScreen,
  ExploreScreen,
  PublicScanScreen,
  VendorProfileScreen,
} from '@/features/vendor-map/screens';
import { ReportContentScreen, VendorReportFormScreen } from '@/features/vendor-reports/screens';
import { ItemDetailScreen, SearchScreen } from '@/features/buyer-discovery/screens';
import { CartScreen, CheckoutScreen } from '@/features/cart/screens';
import {
  CustomerOrdersScreen,
  OrderComplaintScreen,
  OrderDetailScreen,
  OrderReviewScreen,
} from '@/features/orders/screens';

import {
  AddressConflictReviewScreen,
  CollectionReportScreen,
  InboxScreen,
  PenaltyScheduleScreen,
  PermitActionScreen,
  PermitScanScreen,
  PricingScheduleScreen,
  RecordViolationScreen,
  RegistrationReviewScreen,
  RentalApplicationReviewScreen,
  RenewalReviewScreen,
  SlotGridEditorScreen,
  SlotOccupancyScreen,
  SlotProposalReviewScreen,
  SlotTransferReviewScreen,
  VendorReportReviewScreen,
  WardDashboardScreen,
} from '@/features/ward-administration/screens';

import {
  AccountsScreen,
  CategoriesScreen,
  ModerationScreen,
  ReportedContentReviewScreen,
  OrderComplaintReviewScreen,
  PlatformDashboardScreen,
} from '@/features/platform-administration/screens';

function IndexRedirect() {
  const user = useAuthStore((s) => s.user);
  const to = user ? ROLE_HOME_ROUTE[user.role_code] : GUEST_HOME_ROUTE;
  return <Navigate to={to} replace />;
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
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
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
        path="/customer"
        element={
          <RoleShell role="CUSTOMER" allowGuest roleLabel="Người mua" items={CUSTOMER_TABS} />
        }
      >
        <Route path="explore" element={<ExploreScreen />} />
        <Route path="explore/search" element={<SearchScreen />} />
        <Route path="explore/cart" element={<CartScreen />} />
        <Route path="explore/report-content" element={<ReportContentScreen />} />
        <Route path="explore/vendors/:vendorId" element={<VendorProfileScreen />} />
        <Route path="explore/vendors/:vendorId/comments/new" element={<CommentFormScreen />} />
        <Route path="explore/vendors/:vendorId/reports/new" element={<VendorReportFormScreen />} />
        <Route path="explore/items/:itemId" element={<ItemDetailScreen />} />
        <Route path="scan" element={<PublicScanScreen />} />
        <Route path="checkout" element={<CheckoutScreen />} />
        <Route path="account" element={<AccountScreen />} />
        <Route path="orders" element={<CustomerOrdersScreen />} />
        <Route path="orders/:orderId" element={<OrderDetailScreen />} />
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
        <Route path="moderation/complaints/:complaintId" element={<OrderComplaintReviewScreen />} />
      </Route>

      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  );
}
