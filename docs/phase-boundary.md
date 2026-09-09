# Phase boundary

The folder structure records future capabilities but does not implement any of
them. Flags in .env.example default optional phases to disabled.

## Core Must

The committed Core scope is:

- Authentication.
- Business registration.
- Registration evidence.
- Sidewalk slot.
- Rental application.
- Rental contract.
- Renewal.
- Slot return.
- Business address change.
- New slot proposal.
- Slot transfer.
- Digital permit QR.
- Rental fee.
- Penalty.
- Invoice.
- Violation.
- Ward Authority administration.
- Public vendor map.
- Permit verification.
- Vendor comment.
- Suspicious vendor report.
- Platform-level account management.
- Food category configuration.

These names reserve feature boundaries only. No implementation is present.

## Core Extension

The following AI-assisted capabilities are gated behind a stable Core:

- OCR for registration documents.
- Duplicate or fraudulent-application detection.
- Proposed-location analysis.
- On-site inspection-photo analysis.
- Geofence-drift detection.
- Slot-pricing suggestions.
- Fee/violation report summarization.
- Vendor onboarding chatbot.
- Community-report assistance.

AI suggestions must be labelled and advisory. They must never approve, reject,
penalize, suspend, or revoke automatically.

The default flag is:

~~~dotenv
EXPO_PUBLIC_ENABLE_AI_COMPLIANCE=false
~~~

No AI source exists in this scaffold.

## Phase 2

Deferred Phase 2 includes:

- Storefront.
- Menu.
- Storefront discovery and search.
- Cart.
- Checkout.
- Prepaid order.
- Pickup order tracking.
- Order review.
- Complaint and refund.
- Sales summary.
- AI marketplace assistance.

The default flag is:

~~~dotenv
EXPO_PUBLIC_ENABLE_PHASE_2=false
~~~

No Phase 2 folder, source, route, mock, or data model exists.

## Explicitly outside every phase

- Delivery.
- Shipper assignment or fleet.
- Cash on delivery.
- Platform-issued government licence or food-safety certificate.
- Physical enforcement by StreetBiz.
