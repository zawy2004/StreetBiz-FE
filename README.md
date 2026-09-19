# StreetBiz Frontend

WARD-16–18 and SYS-01–02 connect to StreetBiz-BE at `/ward/inbox/reviews`.
BUY-01–05 use live Backend APIs for the customer vendor map, permit check,
public profile, rating and report screens. ADM-01 and ADM-03–05 now provide live
food-category, content-moderation and order-complaint pages. CART-01, ORD-01–04
and SORD-01–04 use live marketplace, cart, customer-order and seller-order APIs.
See
[Community vendor workflows](docs/community-vendor-workflows.md) and
[Platform administration workflows](docs/platform-administration-workflows.md)
and [Commerce order workflows](docs/commerce-order-workflows.md) for setup and
route details.

StreetBiz-FE is the React web client for the StreetBiz sidewalk
vendor-management platform — a Vite single-page app targeting desktop and
mobile browsers (no native app).

The application keeps an in-memory demo layer (`src/mocks/`) while implemented
modules can call StreetBiz-BE. Live modules currently include Authentication,
Vendor Onboarding, Ward slot review/geolocation, Community vendor discovery,
Platform Administration and the cart/order workflows. Setting
`VITE_USE_MOCK_API=true` keeps the navigable demo available without a Backend;
remaining workflows outside that list are still mock-backed.

## Technology baseline

- Vite, React 19.2
- TypeScript with strict checks (`noUncheckedIndexedAccess` on)
- react-router-dom for client-side routing (role-scoped route trees)
- Tailwind CSS for styling, tokens sourced from `src/theme/`
- react-icons (Material Icons) for iconography
- Zustand for client state (auth session, cart, mock domain data)
- Vitest and React Testing Library
- ESLint and Prettier

## Prerequisites

- Node.js 20 or newer
- npm
- A modern desktop or mobile browser

## Install

Run all commands from StreetBiz-FE:

```powershell
npm install
```

No force or legacy-peer-deps option is used.

## Environment

Copy .env.example to .env and adjust public values for the current environment.
Do not commit .env.

```dotenv
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_API=false
VITE_ENABLE_AI_COMPLIANCE=true
VITE_ENABLE_PHASE_2=true
VITE_ENABLE_PUSH_NOTIFICATIONS=false
VITE_ENABLE_PAYMENT_SANDBOX=true
```

`VITE_*` values are included in the client bundle. Never store passwords,
JWTs, OTP secrets, payment secrets, provider keys, or database connection
strings in them.

`VITE_ENABLE_AI_COMPLIANCE` and `VITE_ENABLE_PHASE_2` are `true` by default in
`.env.example` so the demo shows the AI-assist cards and the marketplace
(storefront/menu/cart/checkout) screens; set either to `false` to preview the
Core-only experience.

`VITE_USE_MOCK_API` selects where implemented live modules read and write:

- `false` (default) — they call StreetBiz-BE at `VITE_API_BASE_URL`.
- `true` — they use `src/mocks`, so the app runs with no backend at all. The
  dev-only role switcher and the fixed `123456` OTP only appear in this mode.

See each workflow document for its live routes and role requirements.

## Run

### With StreetBiz-BE (default)

Start the API first — it must be listening on the origin in
`VITE_API_BASE_URL`, and that SPA origin must be listed in the backend's
`Cors:AllowedOrigins`:

```powershell
cd ..\StreetBiz-BE
dotnet run --project src/StreetBiz.API      # http://localhost:5000
```

Then, in StreetBiz-FE:

```powershell
npm install
npm run dev
```

Register a new account from the sign-in screen. The dev SMS sender writes the
OTP to the **API console** as a `[DEV-SMS]` line — copy it into the verify
screen. Note BR-59: the password needs 8+ characters with upper, lower, digit
and a special character.

### Without a backend

Set `VITE_USE_MOCK_API=true` and run `npm run dev`. Open the printed local URL
(default `http://localhost:5173`), sign in with a demo account (see Mock data
layer), or use the dev-only role switcher to jump straight into any role.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` type-checks then produces a static bundle in `dist/` (ignored
by Git); `npm run preview` serves that build locally.

To test Authentication and Vendor Onboarding end to end against StreetBiz-BE
(database setup, automated checks, a manual UI checklist, and simulating the ward
review), follow `../StreetBiz-BE/docs/testing-auth-vendor-onboarding.md`.

## npm scripts

| Script     | Purpose                                               |
| ---------- | ----------------------------------------------------- |
| dev        | Start the Vite dev server                             |
| build      | Type-check and build the production bundle to `dist/` |
| preview    | Serve the production build locally                    |
| lint       | Run ESLint                                            |
| typecheck  | Run TypeScript without emitting files                 |
| test       | Run the Vitest suite once                             |
| test:watch | Run Vitest in watch mode                              |

## Mock data layer and demo accounts

`src/mocks/` is the temporary backend: `types.ts` mirrors StreetBiz-BE's
scaffolded column names (`registration_status`, `permit_status`,
`contract_status`, …), `seed.ts` holds a small realistic dataset for one ward
(Phường Hải Châu 1), and `db.ts` is a Zustand store exposing both the data and
the actions screens call (`approveRentalApplication`, `payFee`,
`recordViolation`, …) — approving a rental application, for example, really
does create a `RentalContract`, a `DigitalPermit`, and the first `FeeItem`
(SYS-03), the way the real backend is expected to. `src/store/auth-store.ts`
holds the signed-in session and persists it via the browser's `localStorage`.

Demo accounts (phone / password `123456` for all):

| Role                      | Phone      | Notes                                                   |
| ------------------------- | ---------- | ------------------------------------------------------- |
| Customer                  | 0905000001 | Trần Hồng Anh                                           |
| Vendor (itinerant)        | 0905000002 | Nguyễn Thị Hoa — has an active rental contract + permit |
| Vendor (fixed storefront) | 0905000003 | Lê Văn Minh — registration pending review               |
| Ward Authority            | 0905000004 | Phạm Văn Sơn, Phường Hải Châu 1                         |
| Platform Administrator    | 0905000005 | Đỗ Quốc Anh                                             |

The "switch role" shortcut on the sign-in screen and the Account tab only
renders when `VITE_APP_ENV=development` — it is not part of AUTH-03 and must
not ship to a real build.

## Source layout

```text
src/
|-- App.tsx        Top-level BrowserRouter + AppProviders + AppRouter
|-- main.tsx        Vite entry point (mounts <App/> into #root)
|-- router.tsx       Full react-router-dom route tree (replaces the old
|                    Expo Router `src/app/` file tree — see Navigation shape)
|-- layouts/         RoleShell (role guard + responsive tab bar wrapper) and
|                    the per-role tab item lists
|-- components/      Shared UI: common, status, forms, layout, feedback
|-- core/            auth (RoleGuard, role-routes), config/env, constants
|                    (status-labels), types (RoleCode), utils (phone)
|-- features/        One folder per capability; each has screens/ and, where
|                    needed, small feature-local state (cart-store,
|                    new-registration-store)
|-- hooks/           useBreakpoint (desktop-sidebar vs mobile-tabs)
|-- mocks/           The in-memory backend — see above
|-- providers/       AppProviders (React Query)
|-- store/           auth-store (session, dev role switch)
+-- theme/           Heritage Tech palette, typography, spacing, shadows —
                     also the source tailwind.config.ts reads its tokens from

tests/
|-- components/    Button, StatusChip
|-- features/      mock-db action behaviour
+-- navigation/    role -> route mapping
```

## Navigation shape

Four role-scoped route subtrees (`/customer`, `/vendor`, `/ward`,
`/platform`), each wrapped by `RoleShell` (`src/layouts/RoleShell.tsx`) which
combines `RoleGuard` (`src/core/auth/RoleGuard.tsx` — a signed-in account can
only reach its own role's routes; `/customer` additionally allows a
signed-out guest) with `RoleTabBar` (`src/components/layout/RoleTabBar.tsx`
— a bottom bar on phones, a 280px indigo sidebar at ≥1024px, driven by
ordinary `react-router-dom` `NavLink`s). Shared `/auth/*` and `/account/*`
routes sit outside every role group. Route paths depart from the flatter
paths sketched in docs/route-plan.md (e.g. vendor detail routes live under
`/vendor/slots/...` rather than a bare `/vendor/...`) — see
docs/route-plan.md for the historical use-case → screen mapping and
`src/router.tsx` for the actual path tree.

## Design system

The palette, typography, and spacing in `src/theme/` are kept from the
Stitch-generated "Heritage Tech" design system, unchanged: primary
`#C84B31`, secondary `#E09F3E`, tertiary (approved/verified) `#2D7D46`,
indigo `#1A2238` for navigation chrome, Be Vietnam Pro for text and Plus
Jakarta Sans (tabular) for money/codes — loaded via Google Fonts in
`index.html`, and re-exposed as Tailwind tokens in `tailwind.config.ts`
(reads `src/theme/*.ts` directly, so the two never drift). Screens were
deliberately simplified from that source design — one primary action per
screen, three status tones only, no decorative legal citations or raw
coordinates — see the `streetbiz-fe-ui-decisions` note for the full
rationale.

## Prepared but not yet wired

- Workflows outside Authentication, Vendor Onboarding, Ward slot review,
  BUY-01–05, ADM-01/03/04/05 and CART/ORD/SORD still call `src/mocks/db.ts`.
- Push notifications, camera access beyond a plain `<input type="file">`.
- SignalR/real-time updates.

## Documentation

- docs/architecture.md
- docs/project-structure.md
- docs/role-permission-matrix.md
- docs/route-plan.md
- docs/phase-boundary.md
- docs/api-integration-plan.md
- docs/community-vendor-workflows.md
- docs/platform-administration-workflows.md
- docs/commerce-order-workflows.md
