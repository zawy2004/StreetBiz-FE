# StreetBiz frontend architecture

## Application shape

StreetBiz-FE is an Expo Universal App:

- Android and iOS provide the mobile experience.
- React Native Web provides browser delivery for the Vendor and
  Guest/Customer PWAs.
- React Native Web also supports desktop-oriented Ward Authority and Platform
  Administrator dashboards.
- Expo Router supplies file-based navigation across all supported platforms.

Only the root layout, foundation screen, and not-found screen exist in this
initial scaffold.

## Feature-based organization

Future business code will be grouped under src/features by business capability,
not by technical file type. Cross-feature infrastructure belongs under src/core,
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
Future communication will use the versioned REST/OpenAPI contract. SignalR may
support real-time status changes later, with refresh or polling fallbacks.

No endpoint, request type, response type, authentication flow, or SignalR hub is
implemented or inferred in this foundation.

## External services

Map/geocoding, camera, document upload, QR, notifications, payments, realtime,
storage, and AI providers must be accessed through replaceable adapters.
Provider SDK types should not leak into feature/domain-facing contracts.

Packages are installed only to prepare the dependency baseline. Runtime
permissions are not requested until a feature actually needs them.

## State and validation

React Query, Zustand, React Hook Form, Zod, and storage packages are installed but
unused. Their concrete boundaries will be designed only with implemented use
cases and the backend contract.

Server authorization remains authoritative. Future frontend route guards improve
navigation but never replace backend role, ward-scope, and ownership checks.

## Cross-platform constraints

- Layouts must eventually support mobile touch and desktop mouse/keyboard use.
- Camera, location, push, and PWA installation need permission-denied and
  unsupported-platform fallbacks.
- Live QR verification must use current server state, never cached validity.
- Public configuration may be exposed in the client bundle; secrets must never
  use an EXPO_PUBLIC variable.
- No native android or ios directory is manually maintained at this stage.
