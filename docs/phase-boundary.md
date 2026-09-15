# Phase boundary

Updated for the UI implementation pass (2026-09). All three tiers below now
have real, navigable screens backed by the mock data layer in `src/mocks/`
(no StreetBiz-BE integration). The flags still gate what's *visible* —
`.env.example` now defaults AI and Phase 2 to `true` so a fresh checkout
shows the full demo; set either to `false` locally to preview the narrower
experience a real staged rollout would ship first.

## Core Must

The committed Core scope, each with an implemented screen (see
`docs/route-plan.md` for the historical route sketch and README.md §
Navigation shape for the actual paths):

- Authentication — `src/features/authentication`, `account-management`.
- Business registration — `src/features/business-registrations`.
- Registration evidence — part of the registration wizard's evidence step.
- Sidewalk slot — `src/features/sidewalk-slots`.
- Rental application — `src/features/sidewalk-slots`.
- Rental contract — `src/features/rental-contracts`.
- Renewal — `rental-contracts/screens/RenewalRequestScreen` +
  `ward-administration/screens/RenewalReviewScreen`.
- Slot return — `rental-contracts/screens/ReturnSlotScreen`.
- Business address change — `business-registrations/screens/AddressUpdateScreen`
  + `ward-administration/screens/AddressConflictReviewScreen`.
- New slot proposal — `sidewalk-slots/screens/SlotProposalScreen` +
  `ward-administration/screens/SlotProposalReviewScreen`.
- Slot transfer — `rental-contracts/screens/{TransferInitiateScreen,
  TransfersListScreen,AcceptTransferScreen}` +
  `ward-administration/screens/SlotTransferReviewScreen`.
- Digital permit QR — `rental-contracts/screens/DigitalPermitScreen` (vendor),
  `vendor-map/screens/PublicScanScreen` (public), `ward-administration/
  screens/PermitScanScreen` (on-site).
- Rental fee, Penalty, Invoice — `src/features/fee-schedules`.
- Violation — `ward-administration/screens/RecordViolationScreen`,
  `fee-schedules/screens/VendorViolationsScreen`.
- Ward Authority administration — `src/features/ward-administration`
  (dashboard, inbox, slot grid/pricing/penalty config, patrol, reports).
- Public vendor map — `vendor-map/screens/ExploreScreen`.
- Permit verification — `vendor-map/screens/PublicScanScreen`.
- Vendor comment — `vendor-map/screens/CommentFormScreen`.
- Suspicious vendor report — `vendor-reports/screens/VendorReportFormScreen`.
- Platform-level account management — `platform-administration/screens/
  AccountsScreen`.
- Food category configuration — `platform-administration/screens/
  CategoriesScreen`.

## Core Extension

The AI-assisted capabilities render as labelled `AiHint` cards (advisory
copy only, no button that approves/rejects/penalizes/suspends/revokes on
their own) inside the relevant Core screen rather than as separate routes,
as originally planned:

- OCR for registration documents — evidence step of the registration wizard.
- Duplicate/fraudulent-application detection, proposed-location analysis —
  `ward-administration/screens/{RegistrationReviewScreen,
  SlotProposalReviewScreen}`.
- On-site inspection-photo analysis, geofence-drift detection —
  `ward-administration/screens/{RecordViolationScreen,PermitScanScreen}`.
- Slot-pricing suggestions — `ward-administration/screens/
  PricingScheduleScreen`.
- Fee/violation report summarization — `ward-administration/screens/
  {WardDashboardScreen,CollectionReportScreen}`.
- Vendor onboarding chatbot — `ai-compliance/screens/VendorAssistantScreen`
  (simple keyword-matched FAQ bot over the mock data, not a real LLM call).
- Community-report assistance — folded into `vendor-reports/screens/
  VendorReportFormScreen`.

Controlled by:

~~~dotenv
EXPO_PUBLIC_ENABLE_AI_COMPLIANCE=true
~~~

## Phase 2

The marketplace flow is implemented end to end against the mock data layer:

- Storefront, Menu — `src/features/storefronts` (vendor side).
- Storefront discovery and search — `src/features/buyer-discovery`.
- Cart, Checkout, prepaid order — `src/features/cart`.
- Pickup order tracking, order review, complaint/refund —
  `src/features/orders`.
- Sales summary — `storefronts/screens/SalesSummaryScreen`.
- AI marketplace assistance — `AiHint` cards in `buyer-discovery/screens/
  SearchScreen` (natural-language search framing) and
  `storefronts/screens/MenuScreen` (dish description/category assist);
  review summarization in `vendor-map/screens/VendorProfileScreen`.
- Content moderation and order-complaint resolution —
  `platform-administration/screens/ModerationScreen`.

Controlled by:

~~~dotenv
EXPO_PUBLIC_ENABLE_PHASE_2=true
~~~

## Explicitly outside every phase

Still entirely absent, by design:

- Delivery.
- Shipper assignment or fleet.
- Cash on delivery.
- Platform-issued government licence or food-safety certificate.
- Physical enforcement by StreetBiz.
