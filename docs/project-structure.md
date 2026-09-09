# Project structure

## src/app

Expo Router route entry points. At foundation stage this contains only:

- _layout.tsx: root Stack layout.
- index.tsx: StreetBiz foundation message.
- +not-found.tsx: unmatched-route message.

Business routes are documented in route-plan.md and are not implemented.

## src/assets

Future fonts, icons, and images owned by the application. No branded or business
asset is included yet.

## src/components

Reserved for proven cross-feature UI:

- common: small broadly reusable primitives.
- feedback: loading, empty, error, and success feedback.
- forms: shared form presentation only.
- layout: responsive layout primitives.
- status: shared status presentation.

No shared component is created speculatively.

## src/core

- api: future generated OpenAPI types and transport setup.
- auth: future authentication contracts.
- config: validated runtime/public configuration.
- constants: application-wide constants with a demonstrated need.
- errors: normalized client errors.
- navigation: navigation contracts and route metadata.
- permissions: future frontend permission helpers.
- storage: storage abstractions.
- types: technical cross-feature types.

There is no API client, auth logic, role guard, or business type today.

## src/features

One folder per Core or Core Extension capability named in Report 3. Each folder
is empty until that capability is explicitly requested. Phase 2 feature folders
are intentionally absent.

## src/hooks and src/providers

Reserved for genuinely shared hooks and application-level providers. React Query
or other providers are not wired during foundation setup.

## src/services

Adapter boundaries for camera, map, notification, payment, QR, realtime, and
upload integrations. No SDK wrapper is implemented yet.

## src/store

Reserved for future client-only state. No Zustand store exists.

## src/theme

Reserved for future design tokens after design work is approved. No visual
system is defined in this scaffold.

## src/types and src/utils

Reserved for cross-cutting types and pure utilities after concrete requirements
exist. Backend models will not be guessed here.

## tests

- components: minimal foundation rendering smoke test.
- features: future feature tests.
- navigation: future routing tests.
- utils: future utility tests.

No business test or mock business data is included.

## docs

Architecture, structure, route planning, actor authority, phase boundaries, and
future backend integration guidance.
