# StreetBiz Frontend

StreetBiz-FE is the Expo React Native foundation for the StreetBiz universal
application. It targets Android, iOS, and React Native Web for mobile PWAs and
desktop-oriented dashboards.

This repository currently contains configuration, dependency preparation,
documentation, three technical route files, and one rendering smoke test. It
contains no business implementation.

## Technology baseline

- Expo SDK 57
- React Native 0.86
- React 19.2
- TypeScript with strict checks
- Expo Router with typed routes
- React Native Web with Metro
- npm
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
EXPO_PUBLIC_ENABLE_AI_COMPLIANCE=false
EXPO_PUBLIC_ENABLE_PHASE_2=false
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=false
EXPO_PUBLIC_ENABLE_PAYMENT_SANDBOX=false
~~~

EXPO_PUBLIC values are included in the client bundle. Never store passwords,
JWTs, OTP secrets, payment secrets, provider keys, or database connection
strings in them.

The API URL is a configuration placeholder only. No backend endpoint or API
client has been implemented.

## Run

~~~powershell
npm start
npm run android
npm run ios
npm run web
~~~

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

## Source layout

~~~text
src/
|-- app/                 Expo Router entry files
|-- assets/              Future fonts, icons, and images
|-- components/          Future proven shared UI
|-- core/                Future cross-cutting contracts/configuration
|-- features/            Core and gated Core Extension boundaries
|-- hooks/               Future shared hooks
|-- providers/           Future application providers
|-- services/            Future external/device adapters
|-- store/               Future client-only state
|-- theme/               Future design tokens
|-- types/               Future cross-cutting types
+-- utils/               Future pure utilities

tests/
|-- components/
|-- features/
|-- navigation/
+-- utils/
~~~

Only src/app/_layout.tsx, src/app/index.tsx, and src/app/+not-found.tsx contain
runtime source. All business routes remain plans in docs/route-plan.md.

## Prepared dependencies

- Device/platform: Router, Linking, Constants, Status Bar, Secure Store,
  Location, Camera, Image Picker, Document Picker, File System, Sharing,
  Notifications, Async Storage, Safe Area, Screens, React Native Web.
- Application preparation: Axios, React Query, Zustand, React Hook Form, Zod,
  Hook Form resolvers, SignalR, and Day.js.
- Tooling: Jest Expo, React Native Testing Library, TypeScript, ESLint, and
  Prettier.

Installing a package does not activate the related feature. No camera/location
permission is requested in app.json.

## Scope boundaries

Core capabilities, AI-assisted Core Extension items, and Phase 2 marketplace
items are documented in docs/phase-boundary.md.

There is no authentication, permission guard, Zustand store, React Query hook,
validation schema, API call, map, QR scanner, payment, notification, AI,
marketplace, delivery, shipper, or mock business data in this foundation.

## Documentation

- docs/architecture.md
- docs/project-structure.md
- docs/role-permission-matrix.md
- docs/route-plan.md
- docs/phase-boundary.md
- docs/api-integration-plan.md
