# Project structure

Updated for the UI implementation pass (2026-09): every route below is real
and navigable, backed by the mock data layer in `src/mocks/` (see
README.md § Mock data layer). No StreetBiz-BE integration exists yet.

## src/app

Expo Router route entry points — thin files only, each importing and
re-exporting its screen from `src/features/**/screens`. No screen logic lives
here. Root `_layout.tsx` wraps `AppProviders` around a `Stack`; `index.tsx`
redirects to the signed-in user's role home (or the guest customer
experience). Route groups: `auth/`, `account/` (shared across roles), and the
four role trees `customer/`, `vendor/`, `ward/`, `platform/`, each an
`expo-router/js-tabs` navigator gated by `src/core/auth/RoleGuard.tsx`. See
README.md § Navigation shape for why paths deviate from route-plan.md's
original flat sketch.

## src/assets

Still empty — no branded or business asset is included; the brand mark is
drawn as SVG in `src/components/common/BrandLogo.tsx` instead of a static
image.

## src/components

Shared cross-feature UI, all implemented:

- common: BrandLogo, Button, Card, Money, ListRow, IconButton, Avatar,
  Divider, QrCode.
- status: StatusChip (maps backend status codes via
  `core/constants/status-labels.ts` to one of 3 tones), AiHint (labelled,
  advisory-only AI suggestion card).
- forms: TextField, PhoneField, PasswordField, OtpInput, SelectField,
  PhotoPicker, SegmentedControl, FilterChips.
- layout: Screen, AppHeader, Section, StickyActions, BottomSheet,
  RoleTabBar (the custom tab bar every role `_layout.tsx` passes to
  `<Tabs tabBar={...}>` — bottom row on phones, indigo sidebar at desktop
  width via `useBreakpoint`).
- feedback: EmptyState, LoadingState, ErrorState, ConfirmDialog, Toast.

## src/core

- auth: `RoleGuard` (route-group access control) and `role-routes.ts`
  (role → tab-bar-root mapping).
- config: `env.ts` — typed reader for the `EXPO_PUBLIC_*` flags.
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

`hooks/useBreakpoint.ts` (desktop ≥1024px check). `providers/AppProviders.tsx`
wraps the app in `SafeAreaProvider` + `QueryClientProvider` and blocks
rendering until Be Vietnam Pro / Plus Jakarta Sans fonts load.

## src/services

Still reserved/empty. Camera and photo picking currently go through
`expo-image-picker` directly from `components/forms/PhotoPicker.tsx`; a
dedicated adapter layer would matter once a real upload/QR/map SDK is wired.

## src/store

`auth-store.ts` — the signed-in session (Zustand + AsyncStorage
persistence), including the dev-only `switchRoleDemo` action gated by
`EXPO_PUBLIC_APP_ENV=development`.

## src/theme

Implemented: `colors.ts` (Heritage Tech palette, unchanged from the source
design), `typography.ts`, `spacing.ts`, `shadows.ts`.

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
