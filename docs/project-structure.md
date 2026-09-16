# Project structure

Updated for the React/Vite migration (2026-09): every route below is real
and navigable, backed by the mock data layer in `src/mocks/` (see
README.md § Mock data layer). No StreetBiz-BE integration exists yet. This
supersedes the earlier Expo Router version of this document — the route
tree now lives in code (`src/router.tsx`), not as a `src/app/` file tree.

## src/router.tsx, src/layouts

`router.tsx` declares the full `react-router-dom` route tree in one place:
public `/auth/*` and shared `/account/*` routes, then four role subtrees
(`/customer`, `/vendor`, `/ward`, `/platform`) each wrapped by
`layouts/RoleShell.tsx`, which combines `src/core/auth/RoleGuard.tsx` (route
access control) with `components/layout/RoleTabBar.tsx` (bottom bar on
phones, indigo sidebar at desktop width). `layouts/role-tabs.ts` holds each
role's tab list (path, label, icon name). `/` redirects to the signed-in
user's role home (or the guest customer experience) via
`core/auth/role-routes.ts`. See README.md § Navigation shape for why paths
deviate from route-plan.md's original flat sketch.

## src/App.tsx, src/main.tsx

`main.tsx` is the Vite entry point — mounts `<App/>` into `#root`. `App.tsx`
wraps `AppRouter` in `BrowserRouter` and `AppProviders`.

## src/assets

Still empty — no branded or business asset is included; the brand mark is
drawn as inline SVG in `src/components/common/BrandLogo.tsx` instead of a
static image.

## src/components

Shared cross-feature UI, all implemented as plain HTML + Tailwind CSS:

- common: BrandLogo, Button, Card, Money, ListRow, IconButton, Avatar,
  Divider, QrCode (via `qrcode.react`), Icon (maps the old MaterialCommunityIcons
  glyph names to `react-icons/md`), Spinner.
- status: StatusChip (maps backend status codes via
  `core/constants/status-labels.ts` to one of 3 tones), AiHint (labelled,
  advisory-only AI suggestion card).
- forms: TextField, PhoneField, PasswordField, OtpInput, SelectField,
  PhotoPicker (native `<input type="file">`), SegmentedControl, FilterChips —
  all keep their original custom `onChangeText`-style prop API.
- layout: Screen, AppHeader, Section, StickyActions, BottomSheet,
  RoleTabBar (renders `react-router-dom` `NavLink`s — bottom row on phones,
  indigo sidebar at desktop width via `useBreakpoint`).
- feedback: EmptyState, LoadingState, ErrorState, ConfirmDialog, Toast.

## src/core

- auth: `RoleGuard` (route-group access control, `react-router-dom`
  `<Navigate>`-based) and `role-routes.ts` (role → route-tree-root mapping).
- config: `env.ts` — typed reader for the `VITE_*` flags (`import.meta.env`).
- constants: `status-labels.ts` — backend status code → Vietnamese label/tone.
- types: `role.ts` — `RoleCode` and its Vietnamese labels.
- utils: `phone.ts`.

`api`, `errors`, `navigation`, `permissions`, `storage` remain unused/empty —
they matter once a real API client replaces the mock layer.

## src/features

One folder per capability area, each with a `screens/` directory (barrel
`index.ts`) and, where a flow needs it, small local state (e.g.
`business-registrations/new-registration-store.ts` for the multi-step
registration wizard, `cart/cart-store.ts` for CART-01). Folder names don't
map 1:1 to the original reserved-folder list in Report 3 — related use cases
were grouped for locality (e.g. all Ward Authority review screens live in
`ward-administration`) rather than split into many near-empty folders. Phase
2 folders (`storefronts`, `cart`, `orders`, `buyer-discovery`) are populated.

## src/hooks and src/providers

`hooks/useBreakpoint.ts` (desktop ≥1024px check, `window.matchMedia`-based).
`providers/AppProviders.tsx` wraps the app in `QueryClientProvider` and
mounts `ToastHost`; fonts load via a Google Fonts `<link>` in `index.html`
rather than a JS gate.

## src/services

Still reserved/empty. Photo picking goes through a plain
`<input type="file">` in `components/forms/PhotoPicker.tsx`; a dedicated
adapter layer would matter once a real upload/QR/map SDK is wired.

## src/store

`auth-store.ts` — the signed-in session (Zustand + `localStorage`
persistence), including the dev-only `switchRoleDemo` action gated by
`VITE_APP_ENV=development`.

## src/theme

Implemented: `colors.ts` (Heritage Tech palette, unchanged from the source
design), `typography.ts`, `spacing.ts`, `shadows.ts` — all plain TypeScript
data with no framework coupling. `tailwind.config.ts` at the repo root
imports these directly to build the Tailwind color/spacing/radius/fontSize
scale, so the theme has one source of truth.

## src/mocks

The temporary backend. `types.ts` mirrors StreetBiz-BE's scaffolded column
names; `seed.ts` is a small realistic dataset for one ward; `db.ts` is a
Zustand store exposing both the data and the state-changing actions screens
call (approve/reject, pay, scan, record violation, …); `ids.ts` generates
readable mock ids and reserves every hardcoded seed id so generated ids can
never collide with them (a real bug this caught — see
`tests/features/mock-db.test.ts`).

## src/types and src/utils

Still reserved — cross-cutting types live next to what uses them
(`mocks/types.ts`, `core/types/role.ts`) rather than here for now.

## tests

Run with Vitest + React Testing Library (`vitest.config.ts`).

- components: Button, StatusChip.
- features: mock-db action behaviour (approve → contract + permit + fee
  item, pay → invoice, reject → slot released).
- navigation: role → route mapping.

A use-case-to-route coverage test is not implemented yet — see
`docs/route-plan.md` for the route inventory to check the app against
manually if needed.

## docs

Architecture, structure, route planning, actor authority, phase boundaries,
and future backend integration guidance.
