# StreetBiz Frontend

The frontend for **StreetBiz**, a mobile-first Progressive Web App that connects
micro food and beverage vendors with ward authorities through a transparent
sidewalk registration, rental, permit, and compliance workflow.

> **Project status:** requirements and repository initialization. The application
> has not been scaffolded yet, so this repository is not currently runnable.
> Scope in this README follows the revised SRS baseline dated 30 August 2026.

## Product overview

StreetBiz helps vendors request lawful use of configured sidewalk vending slots
and gives ward officers one place to review applications, issue verifiable digital
permits, collect fees, and record violations. Residents can browse active vendors
and verify permits without signing in.

StreetBiz records and presents decisions made by the relevant ward authority. It
does not independently issue a business licence, certify food safety, or create a
legal right to use public space.

## Release scope

### Core

- Phone/OTP authentication and role-based experiences.
- Vendor classification: **Fixed Storefront** or **Itinerant**.
- Independent business-registration and sidewalk-rental applications.
- Interactive legal-slot map, pricing, schedules, and availability.
- QR permit display and live public/on-site verification.
- Rental-fee and penalty payment, invoices, and due-date tracking.
- Renewal, address change, new-slot proposal, and slot-transfer flows.
- Ward dashboards for application review, occupancy, compliance, and reporting.
- Public vendor map, comments, and suspicious-vendor reports.
- Platform-level account and category administration.

### Core extension

AI-assisted compliance tools may be added only after their supporting Core flow is
stable. All AI results must be labelled and remain suggestions; a ward officer
retains every approval, rejection, penalty, and permit decision.

### Phase 2

The marketplace is deliberately deferred. It will add storefronts, menus,
discovery, prepaid checkout, pickup order tracking, reviews, and complaints only
for vendors with an approved registration and an active rental contract. Delivery,
shippers, and cash on delivery are out of scope.

## User experiences

| Surface | Primary capabilities |
| --- | --- |
| Vendor PWA | Registration, slot application, permits, fees, penalties, renewals, transfers |
| Ward Authority dashboard | Slot-grid management, reviews, inspection, compliance, reporting |
| Guest/Customer PWA | Active-vendor map, QR scan, public profile, comments and reports |
| Platform Admin dashboard | Accounts and categories; Phase 2 content and complaint moderation |

The Ward Authority and Platform Administrator roles are intentionally separate.
Platform administrators cannot approve registrations, rentals, fees, penalties,
or permits.

```mermaid
flowchart LR
    A[Choose vendor type] --> B[Submit business registration]
    B --> C[Ward review]
    C --> D[Choose eligible sidewalk slot]
    D --> E[Submit rental application]
    E --> F[Ward approval]
    F --> G[QR permit and fee schedule]
    G --> H[Live public or on-site verification]
```

## Planned frontend stack

- React and TypeScript
- Vite with PWA/service-worker support (Workbox or equivalent)
- Responsive mobile and desktop UI
- Leaflet with OpenStreetMap-compatible map services
- Firebase Cloud Messaging or an equivalent web-push provider
- Vitest and Testing Library for component tests
- Playwright for critical end-to-end journeys
- ESLint and an approved formatter

External services must be accessed through replaceable adapters. Unsupported or
denied push, geolocation, camera, and PWA-installation capabilities need usable
fallbacks.

## Getting started

There is no package manifest or frontend source code in the repository yet. After
the application foundation is committed, this section will document the exact:

1. Node.js and package-manager versions.
2. Environment-file template and required public configuration.
3. Install, development, build, lint, and test commands.
4. Local backend URL and mock/sandbox setup.

Expected configuration categories include the backend base URL, map/geocoding
provider, web-push settings, and environment name. Do not commit credentials or
real identity/payment data.

## Frontend requirements

- Support agreed current Chrome, Edge, and Safari versions on mobile and desktop.
- Use HTTPS for full PWA, geolocation, camera, and notification functionality.
- Keep public permit verification live and server-authoritative, not offline or
  cache-authoritative.
- Show clear loading, empty, validation, permission, and provider-failure states.
- Display money in VND and dates in the `Asia/Ho_Chi_Minh` time zone.
- Protect role-specific routes and still rely on backend authorization for every
  protected operation.
- Cover critical registration, rental, fee, and permit UI states with automated
  tests and end-to-end journeys.
- Meet accessible-label, keyboard, contrast, and representative responsive-layout
  checks before release.

## Related repository

The REST API, domain workflows, persistence, payment callbacks, QR validation, and
integration adapters live in
[StreetBiz-BE](https://github.com/zawy2004/StreetBiz-BE).

## Contributing

Use a short-lived `feature/<issue>-short-name` or `fix/<issue>-short-name` branch.
Pull requests should identify the relevant requirement, explain the change and
risk, include test evidence, and receive at least one approval before merge.

## Team

- Dinh Gia Huy — Team Leader
- Nguyen Duy Luong
- Park Jea Minh
- Truong Huynh Long Vien
- Do Thanh Tin
- Nguyen Quoc Long — Supervisor

## Licence

No open-source licence has been published for this repository yet.
