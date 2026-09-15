# Role and permission matrix

This document records intended product authority from Report 3.
`src/core/auth/RoleGuard.tsx` now enforces route-group access on the
frontend (a signed-in account can only reach its own role's tab group; guest
access is allowed only where marked below), and screens scope mock-data
reads/writes to the signed-in account's own records. This is still a
frontend-only, client-side check against mock data — backend authorization
remains authoritative once StreetBiz-BE is integrated, and none of this
should be treated as a security boundary.

## Actors

| Actor | Core authority |
| --- | --- |
| Guest | Browse the public active-vendor map, view approved public vendor information, and scan a permit QR without signing in. |
| Customer | Guest capabilities plus commenting on vendors and submitting suspicious-vendor reports after authentication. |
| Vendor | Submit and manage only their own registration, evidence, rental, contract, permit, fee, penalty, invoice, address-change, proposal, renewal, return, and transfer data. |
| Ward Authority | Manage its ward's registration reviews, slot grid, pricing, rental decisions, permits, fees, violations, penalties, transfers, proposed slots, and compliance reporting. |
| Platform Administrator | Manage platform-level accounts and food categories. Future Phase 2 authority covers marketplace content, complaints, and platform reporting. |

## Vendor classification

FIXED_STOREFRONT and ITINERANT are business-registration attributes, not separate
system roles.

- FIXED_STOREFRONT has a fixed address and applies for a configured adjacent
  slot. Evidence includes the required licence/address documents.
- ITINERANT has no fixed premise, uses identity evidence, browses open slots, and
  may hold multiple active open-slot rentals subject to availability.

A Vendor may hold multiple business registrations. Registration approval and
rental approval are independent workflows.

## Capability matrix

Legend: View means permitted read access, Own means limited to owned data,
Manage means operational actions, and Review means a human decision.

| Capability | Guest | Customer | Vendor | Ward Authority | Platform Administrator |
| --- | --- | --- | --- | --- | --- |
| Public active-vendor map | View | View | View | View | View |
| Live public permit QR verification | View | View | View own | Manage on-site | No ward decision |
| Vendor comments | No | Own | View own public profile | View for compliance | Future content moderation only |
| Suspicious-vendor report | No submission | Own | No | Review/manage | No ward decision |
| Business registration/evidence | No | No | Own | Review/manage | No access to ward evidence authority |
| Sidewalk slots and rental | No | No | Own applications/contracts | Review/manage | No ward authority |
| Permit issuance/suspension/revocation | No | No | View own | Review/manage | No |
| Rental fees, penalties, invoices | No | No | Own | Manage ward collection | No |
| Violations | No | Report only | View own | Record/manage | No |
| Renewal, return, address change | No | No | Own | Review/manage | No |
| Slot proposal and transfer | No | No | Own | Review/manage | No |
| Platform account management | No | No | No | No | Manage |
| Food category configuration | View when relevant | View when relevant | View when relevant | No | Manage |
| Phase 2 marketplace moderation | Deferred | Deferred | Deferred | No | Deferred manage |

## Separation of authority

- Ward Authority is the sole administrative decision-maker for registrations,
  rentals, renewals, transfers, proposed slots, violations, and permit actions.
- Platform Administrator must not approve or reject any ward registration,
  rental, fee, penalty, or permit decision.
- Vendor access is ownership-scoped.
- Guest access is public and read-only.
- Customer comments and reports require authentication.
- AI output, when the gated extension is eventually implemented, remains labelled
  decision support and cannot perform an approval or penalty decision.
