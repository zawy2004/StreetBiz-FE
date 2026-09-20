# StreetBiz frontend architecture

## Application shape

StreetBiz-FE is a React single-page web app (Vite + react-router-dom), with
no native mobile target:

- A responsive layout serves both the Vendor / Guest-Customer mobile-web
  experience (bottom tab bar, ≤1024px) and the desktop-oriented Ward
  Authority / Platform Administrator dashboards (fixed sidebar, ≥1024px)
  from the same codebase — see `src/hooks/useBreakpoint.ts` and
  `src/components/layout/RoleTabBar.tsx`.
- `react-router-dom` supplies client-side routing; the full route tree is
  declared in `src/router.tsx` (see docs/project-structure.md).

Business screens for all four roles are implemented (see
docs/project-structure.md), backed by an in-memory mock data layer
(src/mocks/) rather than StreetBiz-BE.

## Feature-based organization

Business code is grouped under src/features by business capability, not by
technical file type. Cross-feature infrastructure belongs under src/core,
while device/provider boundaries belong under src/services.

Dependency direction should remain:

~~~text
src/app
  -> src/features
     -> src/core contracts
  -> src/providers

src/services
  -> external device or provider SDKs
~~~

Feature folders must not import from one another through deep internal paths.
Shared behavior should be promoted only after a concrete reuse case exists.

## Backend and communication

The backend is StreetBiz-BE, implemented with ASP.NET Core .NET 8 and SQL Server.
Future communication will use the versioned REST/OpenAPI contract. Order detail
uses the authenticated `/hubs/orders` SignalR hub, with polling as a connection
fallback; other workflows may add their own realtime contracts later.

No endpoint, request type, response type, authentication flow, or additional SignalR hub is
implemented or inferred in this foundation.

## External services

Map/geocoding, camera, document upload, QR, notifications, payments, realtime,
storage, and AI providers must be accessed through replaceable adapters.
Provider SDK types should not leak into feature/domain-facing contracts.

Packages are installed only to prepare the dependency baseline. Runtime
permissions are not requested until a feature actually needs them.

## State and validation

Zustand backs the session (src/store/auth-store.ts, persisted to
`localStorage`), the mock backend (src/mocks/db.ts), and small feature-local
state (cart, multi-step wizards). React Query is wired via AppProviders but
not yet used by any screen, since there is no network layer to cache — it
activates once feature `api.ts` files call a real backend. React Hook Form,
Zod, and storage packages remain installed but unused pending the real API
contract.

src/core/auth/RoleGuard.tsx enforces role-scoped route access on the
frontend today. Server authorization remains authoritative once
StreetBiz-BE is integrated — this guard never replaces backend role,
ward-scope, and ownership checks.

## Cross-platform constraints

- Layouts support both mobile touch and desktop mouse/keyboard use from one
  responsive codebase (see Application shape above).
- Camera/photo access goes through a plain `<input type="file">`; push
  notifications and PWA installation are not implemented and need
  permission-denied / unsupported-browser fallbacks whenever they are.
- Live QR verification must use current server state, never cached validity.
- Public configuration may be exposed in the client bundle; secrets must never
  use a VITE_ variable.
- There is no native mobile app at this stage — no android/ios directory.
