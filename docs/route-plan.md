# Route plan

**Status (2026-09): implemented, with different paths.** Every business
route below now has a real screen, but role-scoped routes were nested inside
each role's tab folder (e.g. `/vendor/slots/contracts/[id]/permit`, not the
flat `/vendor/contracts/[contractId]/permit` sketched below) so each tab
could own its own navigation Stack under `expo-router/js-tabs` without a
long list of hidden tab entries — see README.md § Navigation shape. Treat
this document as the historical use-case → screen inventory (still accurate
for *what* each route does) rather than the literal URL structure; the
`src/app/` tree is the source of truth for actual paths.

This is a planning artifact derived from Report 3, originally written before
implementation. Final paths changed when navigation was implemented.

## Public and common authentication

| Planned route | Planned screen |
| --- | --- |
| / | Entry or onboarding |
| /auth/sign-in | Phone/OTP sign-in |
| /auth/register | Account registration and ward selection |
| /auth/verify-phone | Phone verification |
| /auth/password/reset-request | Password-reset request |
| /auth/password/reset | Password reset |
| /account/password | Change password |
| /account/sessions | View and revoke active sessions |

Authentication and session behavior are not implemented.

## Guest and Customer Core

| Planned route | Planned screen |
| --- | --- |
| /vendors/map | Active permitted-vendor map |
| /permits/scan | Public QR permit scanner |
| /vendors/[vendorId] | Approved public vendor profile |
| /vendors/[vendorId]/comments/new | Authenticated customer comment |
| /vendors/[vendorId]/reports/new | Authenticated suspicious-vendor report |

Guest can browse the map/profile and scan permits. Commenting or reporting
requires an authenticated Customer. The live permit result must come from the
backend when implemented.

## Vendor Core

### Registration

| Planned route | Planned screen |
| --- | --- |
| /vendor/registrations | Registration list/status |
| /vendor/registrations/new/type | FIXED_STOREFRONT or ITINERANT selection |
| /vendor/registrations/new/details | Business-registration form |
| /vendor/registrations/new/evidence | Evidence upload |
| /vendor/registrations/[registrationId] | Registration status/detail |

### Slots, rentals, and contracts

| Planned route | Planned screen |
| --- | --- |
| /vendor/slots/map | Open sidewalk-slot map for itinerant vendors |
| /vendor/slots/[slotId] | Slot detail |
| /vendor/registrations/[registrationId]/adjacent-slot | Fixed-storefront adjacent-slot application |
| /vendor/rental-applications | Rental application status list |
| /vendor/rental-applications/[applicationId] | Rental application detail |
| /vendor/contracts | Active rental contracts |
| /vendor/contracts/[contractId] | Contract detail |
| /vendor/contracts/[contractId]/renewal | Renewal request |
| /vendor/contracts/[contractId]/return | Slot cancellation/return confirmation |
| /vendor/contracts/[contractId]/permit | Digital QR permit |

### Address, proposals, and transfers

| Planned route | Planned screen |
| --- | --- |
| /vendor/registrations/[registrationId]/address | Business-address update |
| /vendor/slot-proposals/new | Propose an unlisted slot |
| /vendor/transfers | Incoming/outgoing transfers |
| /vendor/contracts/[contractId]/transfer | Initiate transfer |
| /vendor/transfers/[transferId]/accept | Receiving-vendor acceptance |

### Finance and compliance

| Planned route | Planned screen |
| --- | --- |
| /vendor/finance | Fee and penalty dashboard |
| /vendor/fees/[feeId]/payment | Rental-fee payment |
| /vendor/penalties/[penaltyId]/payment | Penalty payment |
| /vendor/invoices | Invoice list |
| /vendor/invoices/[invoiceId] | Invoice view/download |
| /vendor/payments | Payment and penalty history |
| /vendor/violations | Own violation history |

## Ward Authority Core

| Planned route | Planned screen |
| --- | --- |
| /ward/dashboard | Ward operational dashboard |
| /ward/slots | Slot occupancy dashboard |
| /ward/slots/editor | Slot-grid mapping editor |
| /ward/pricing | Slot pricing and schedule |
| /ward/penalty-schedules | Penalty fee configuration |
| /ward/registrations | Registration review queue |
| /ward/registrations/[registrationId] | Registration/evidence review |
| /ward/rental-applications | Rental review queue |
| /ward/rental-applications/[applicationId] | Rental review |
| /ward/renewals | Renewal review queue |
| /ward/permits/scan | On-site QR verification |
| /ward/violations/new | Violation recording |
| /ward/permits/[permitId]/action | Explicit suspension/revocation |
| /ward/reports/collection | Fee and penalty collection report |
| /ward/reports/operations | Ward operational report |
| /ward/slot-proposals | Proposed-slot review |
| /ward/slot-transfers | Slot-transfer review |
| /ward/address-conflicts | Address-change slot-conflict resolution |

Ward Authority actions must be limited to the officer's configured ward.

## Platform Administrator Core

| Planned route | Planned screen |
| --- | --- |
| /platform/accounts | Platform account management |
| /platform/categories | Food-category configuration |

Platform Administrator has no Ward Authority registration, rental, fee, penalty,
violation, or permit action route.

## Core Extension planning

AI capabilities are expected to appear as explicitly labelled actions or panels
inside their supporting Core screens rather than independent authority routes.
Examples include OCR review, duplicate flags, slot-feasibility analysis,
inspection-photo analysis, drift alerts, pricing suggestions, report summaries,
the vendor chatbot, and community-report assistance.

No AI route is created while EXPO_PUBLIC_ENABLE_AI_COMPLIANCE is false.

## Deferred Phase 2 route families

The following planned route families are documentation only:

- Vendor storefront setup, business hours, menu management, seller order queue,
  and sales summary.
- Customer storefront discovery, menu detail, single-storefront cart, prepaid
  checkout, pickup tracking, receipts, reviews, complaints, and refunds.
- Platform content moderation, order complaint resolution, and marketplace
  operational reporting.
- AI dish description, food-image recognition, natural-language search, and
  review summarization.

There is no delivery, shipper, or cash-on-delivery route in any phase.
