# StreetBiz Frontend

StreetBiz-FE is the Expo React Native client for the StreetBiz sidewalk
vendor-management platform. It targets Android, iOS, and React Native Web for
mobile PWAs and desktop-oriented dashboards.

The app implements the full Core, Core Extension (AI), and Phase 2 use-case
catalog from Report 3 (115 use cases across Guest/Customer, Vendor, Ward
Authority, and Platform Administrator) as real, navigable screens backed by an
in-memory mock data layer (`src/mocks/`). There is no backend integration yet
— every screen reads/writes a client-side Zustand store seeded with demo
data, so the whole app can be explored end to end without StreetBiz-BE
running. Swapping the mock layer for real HTTP calls is meant to be a
per-feature `api.ts` change, not a rewrite of any screen.

## Technology baseline

- Expo SDK 57, React Native 0.86, React 19.2
- TypeScript with strict checks (`noUncheckedIndexedAccess` on)
- Expo Router with typed routes (`expo-router/js-tabs` for role tab bars)
- Zustand for client state (auth session, cart, mock domain data)
- React Native Web with Metro
- Jest Expo and React Native Testing Library
- ESLint and Prettier

## Prerequisites

- Node.js 22.13 or newer for Expo SDK 57
- npm
- Expo Go, Android Emulator, or a supported browser
- macOS/Xcode or an Expo/EAS workflow for native iOS builds

## Install

Run all commands from StreetBiz-FE:

~~~powershell
npm install
~~~

No force or legacy-peer-deps option is used.

## Environment

Copy .env.example to .env and adjust public values for the current environment.
Do not commit .env.

~~~dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api
EXPO_PUBLIC_ENABLE_AI_COMPLIANCE=true
EXPO_PUBLIC_ENABLE_PHASE_2=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=false
EXPO_PUBLIC_ENABLE_PAYMENT_SANDBOX=true
~~~

EXPO_PUBLIC values are included in the client bundle. Never store passwords,
JWTs, OTP secrets, payment secrets, provider keys, or database connection
strings in them.

`EXPO_PUBLIC_ENABLE_AI_COMPLIANCE` and `EXPO_PUBLIC_ENABLE_PHASE_2` are `true`
by default in `.env.example` so the demo shows the AI-assist cards and the
marketplace (storefront/menu/cart/checkout) screens; set either to `false` to
preview the Core-only experience. `EXPO_PUBLIC_API_BASE_URL` is currently
unused — no HTTP client is wired up (see Mock data layer below).

## Run

~~~powershell
npm start
npm run android
npm run ios
npm run web
~~~

Sign in with a demo account (see Mock data layer), or use the dev-only role
switcher on the sign-in screen / Account tab to jump straight into any role.
Android Emulator uses 10.0.2.2 to reach a backend on the host computer. A
physical device uses the LAN IP of the machine running StreetBiz-BE.

## Quality checks

~~~powershell
npm run doctor
npm run lint
npm run typecheck
npm test -- --runInBand
npm run export:web
~~~

The web export is written to dist and is ignored by Git.

## npm scripts

| Script | Purpose |
| --- | --- |
| start | Start the Expo development server |
| android | Start Expo and open Android |
| ios | Start Expo and open iOS |
| web | Start Expo for web |
| lint | Run Expo ESLint |
| typecheck | Run TypeScript without emitting files |
| test | Run Jest |
| test:watch | Run Jest in watch mode |
| doctor | Run Expo Doctor |
| export:web | Create the static web export |

## Mock data layer and demo accounts

`src/mocks/` is the temporary backend: `types.ts` mirrors StreetBiz-BE's
scaffolded column names (`registration_status`, `permit_status`,
`contract_status`, …), `seed.ts` holds a small realistic dataset for one ward
(Phường Hải Châu 1), and `db.ts` is a Zustand store exposing both the data and
the actions screens call (`approveRentalApplication`, `payFee`,
`recordViolation`, …) — approving a rental application, for example, really
does create a `RentalContract`, a `DigitalPermit`, and the first `FeeItem`
(SYS-03), the way the real backend is expected to. `src/store/auth-store.ts`
holds the signed-in session and persists it via AsyncStorage.

Demo accounts (phone / password `123456` for all):

| Role | Phone | Notes |
| --- | --- | --- |
| Customer | 0905000001 | Trần Hồng Anh |
| Vendor (itinerant) | 0905000002 | Nguyễn Thị Hoa — has an active rental contract + permit |
| Vendor (fixed storefront) | 0905000003 | Lê Văn Minh — registration pending review |
| Ward Authority | 0905000004 | Phạm Văn Sơn, Phường Hải Châu 1 |
| Platform Administrator | 0905000005 | Đỗ Quốc Anh |

The "switch role" shortcut on the sign-in screen and the Account tab only
renders when `EXPO_PUBLIC_APP_ENV=development` — it is not part of AUTH-03
and must not ship to a real build.

## Source layout

~~~text
src/
|-- app/          Expo Router route files only — one thin file per route that
|                  renders the matching screen from src/features/**/screens
|-- components/    Shared UI: common, status, forms, layout, feedback
|-- core/          auth (RoleGuard, role-routes), config/env, constants
|                  (status-labels), types (RoleCode), utils (phone)
|-- features/      One folder per capability; each has screens/ and, where
|                  needed, small feature-local state (cart-store,
|                  new-registration-store)
|-- hooks/         useBreakpoint (desktop-sidebar vs mobile-tabs)
|-- mocks/         The in-memory backend — see above
|-- providers/     AppProviders (fonts, SafeArea, React Query)
|-- store/         auth-store (session, dev role switch)
+-- theme/         Heritage Tech palette, typography, spacing, shadows

tests/
|-- components/    Button, StatusChip
|-- features/      mock-db action behaviour
+-- navigation/    role -> route mapping
~~~

## Navigation shape

Four role-scoped tab groups (`(customer)` shown as `/customer`, `/vendor`,
`/ward`, `/platform`), each an `expo-router/js-tabs` navigator with a custom
`RoleTabBar` (bottom bar on phones, a 280px indigo sidebar at ≥1024px — see
`src/components/layout/RoleTabBar.tsx`), gated by `RoleGuard`
(`src/core/auth/RoleGuard.tsx`) so a signed-in account can only reach its own
role's routes; `/customer` additionally allows a signed-out guest. Shared
`/auth/*` and `/account/*` routes sit outside every role group. This departs
from the flatter paths sketched in docs/route-plan.md (e.g. vendor detail
routes live under `/vendor/slots/...` rather than a bare `/vendor/...`) so
that each tab can own a nested Stack without an explosion of hidden
`Tabs.Screen` entries — route-plan.md's own note that paths may change once
navigation is implemented covers this.

## Design system

The palette, typography, and spacing in `src/theme/` are kept from the
Stitch-generated "Heritage Tech" design system, unchanged: primary
`#C84B31`, secondary `#E09F3E`, tertiary (approved/verified) `#2D7D46`,
indigo `#1A2238` for navigation chrome, Be Vietnam Pro for text and Plus
Jakarta Sans (tabular) for money/codes. Screens were deliberately simplified
from that source design — one primary action per screen, three status tones
only, no decorative legal citations or raw coordinates — see the
`streetbiz-fe-ui-decisions` note for the full rationale.

## Prepared but not yet wired

- `EXPO_PUBLIC_API_BASE_URL` / an HTTP client — screens call `src/mocks/db.ts`
  directly instead of a network layer.
- Push notifications, camera/location permissions in app.json.
- SignalR/real-time updates.

## Documentation

- docs/architecture.md
- docs/project-structure.md
- docs/role-permission-matrix.md
- docs/route-plan.md
- docs/phase-boundary.md
- docs/api-integration-plan.md
