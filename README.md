<div align="center">

# StreetBiz Web

**React web client for StreetBiz, the sidewalk-vendor management and marketplace platform for the wards of Đà Nẵng.**

[![CI](https://github.com/zawy2004/StreetBiz-FE/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/zawy2004/StreetBiz-FE/actions/workflows/ci.yml)
![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Hosted_on-Vercel-000000?logo=vercel&logoColor=white)

[Live site](https://www.streetbiz.id.vn) · [Backend repo](https://github.com/zawy2004/StreetBiz-BE) · [Mobile app repo](https://github.com/zawy2004/StreetBiz-App)

</div>

---

## Contents

- [Overview](#overview)
- [Features by role](#features-by-role)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts and quality checks](#scripts-and-quality-checks)
- [Project structure](#project-structure)
- [Routing and access control](#routing-and-access-control)
- [Design system](#design-system)
- [Deployment](#deployment)
- [Documentation](#documentation)

## Overview

StreetBiz Web is a single-page app for desktop and mobile browsers. It covers every role
in StreetBiz, each with its own route tree and navigation: a bottom tab bar on phones and a
sidebar from 1024 px up. It talks to [StreetBiz-BE](https://github.com/zawy2004/StreetBiz-BE)
over REST and SignalR. A built-in mock layer also lets the whole app run without a backend
for demos.

## Features by role

| Role | Screens |
| --- | --- |
| **Guest and customer** | Vendor map, permit check by QR, public vendor profiles, storefronts and menus, cart and checkout, order tracking, ratings and reports, AI assistant, chat with vendors |
| **Vendor** | Business registration with eKYC, slot proposals, rentals and renewals, fees and invoices, digital permit and price board, storefront and menu, incoming orders, payout accounts, household tax |
| **Ward authority** | Registration review queue, slots and pricing zones, slot transfers, fee schedules and collection reports, violations and penalties, food safety |
| **Platform administrator** | Food categories, content moderation, order complaints, accounts, platform dashboard and report export |

All users also get sign-in with a password or an SMS OTP, password reset, session
management and notifications.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 19.2, Vite 6, TypeScript strict (`noUncheckedIndexedAccess`) |
| Routing | React Router 7, role-scoped route trees |
| Server state | TanStack Query 5, Axios |
| Client state | Zustand (session, cart, mock data) |
| Forms | React Hook Form and Zod |
| Real time | `@microsoft/signalr` with polling fallback |
| UI | Tailwind CSS 3, design tokens in `src/theme/`, React Icons, Motion |
| Maps and QR | Goong Maps, `qrcode.react`, `jsqr` |
| Content | React Markdown with GFM for assistant replies |
| Quality | Vitest, React Testing Library, axe-core, ESLint, Prettier |

## Getting started

### Prerequisites

- Node.js 20 or newer and npm
- For live mode: StreetBiz-BE running locally (see its README)

### Install and run

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

### Live mode (default)

With `VITE_USE_MOCK_API=false` the app calls the API at `VITE_API_BASE_URL`. Start the backend
first:

```powershell
cd ..\StreetBiz-BE
dotnet run --project src/StreetBiz.API --launch-profile https
```

Sign in with a demo account from the backend seed (password `Password123!`):

| Role | Phone |
| --- | --- |
| Platform administrator | `0900000001` |
| Ward authority | `0983000001` |
| Vendor | `0905000101` |
| Customer | `0905000201` |

> [!NOTE]
> The site's origin must be listed in the backend's `Cors:AllowedOrigins`. Passwords need at
> least 8 characters with upper case, lower case, a digit and a symbol (BR-59).

### Mock mode (no backend)

Set `VITE_USE_MOCK_API=true`. Screens then read and write the in-memory store in `src/mocks/`.
Demo accounts in this mode are `0905000001` to `0905000005` with password `123456`, and the OTP
is always `123456`. In development a role switcher on the sign-in screen jumps straight into
any role.

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API base URL, for example `https://localhost:7147/api` |
| `VITE_USE_MOCK_API` | `true` runs on the mock layer with no backend |
| `VITE_APP_ENV` | `development` shows demo shortcuts. Use `production` for real builds |
| `VITE_ENABLE_AI_COMPLIANCE` | AI suggestion cards |
| `VITE_ENABLE_PHASE_2` | Marketplace screens (storefront, menu, cart, checkout) |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | Browser push notifications |
| `VITE_GOONG_MAPTILES_KEY`, `VITE_CARTO_API_KEY` | Optional map tiles. Without them the maps fall back to Esri tiles |
| `VITE_CITY_FEEDBACK_PHONE`, `VITE_CITY_FEEDBACK_URL` | Đà Nẵng's 1022 citizen feedback channel, linked from the public QR page |

> [!CAUTION]
> Every `VITE_*` value ends up in the browser bundle. Never put passwords, tokens, OTP secrets,
> payment or provider keys in them.

## Scripts and quality checks

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no output |
| `npm test` | Vitest, run once |
| `npm run test:watch` | Vitest in watch mode |

Before opening a pull request, run:

```powershell
npm run lint; npm run typecheck; npm test; npm run build
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the same four steps on every
pull request.

## Project structure

```text
src/
├── main.tsx · App.tsx · router.tsx   Entry point and the full route tree
├── layouts/        RoleShell: role guard and responsive navigation
├── features/       One folder per capability (screens, API calls, local state)
├── components/     Shared UI: common, forms, layout, status, feedback
├── core/           API client, auth guards, permissions, env config, routing, errors
├── services/       Adapters: camera, map, notification, payment, QR, realtime, upload
├── mocks/          In-memory backend for mock mode
├── store/          Global Zustand stores (auth session, theme)
├── providers/      App providers (React Query)
├── hooks/          Shared hooks (breakpoint, countdown, polling, ...)
├── theme/          Colour, type and spacing tokens
└── utils/          Pure helpers

tests/
├── components/  ├── features/  ├── navigation/
├── a11y/        ├── utils/     └── e2e/
```

## Routing and access control

| Prefix | Who can enter |
| --- | --- |
| `/customer` | Customers, and guests for public pages |
| `/vendor` | Vendors |
| `/ward` | Ward authorities |
| `/platform` | Platform administrators |
| `/auth`, `/account` | Shared sign-in and account pages |

`RoleShell` wraps each tree with `RoleGuard`, so a signed-in account can only reach its own
role's routes. The real path tree is [src/router.tsx](src/router.tsx). The role matrix is in
[docs/role-permission-matrix.md](docs/role-permission-matrix.md).

## Design system

"Heritage Tech" tokens live in `src/theme/` and feed `tailwind.config.ts` directly, so the CSS
and the TypeScript tokens never drift:

| Token | Value | Use |
| --- | --- | --- |
| Primary | `#C84B31` | Main actions |
| Secondary | `#E09F3E` | Highlights |
| Tertiary | `#2D7D46` | Approved and verified states |
| Indigo | `#1A2238` | Navigation chrome |
| Fonts | Be Vietnam Pro, Plus Jakarta Sans (tabular) | Text, and money or codes |

Screens follow a few rules: one primary action per screen, three status tones, and no raw
coordinates or legal citations shown to the user.

## Deployment

The site is deployed on **Vercel** from this repository. [vercel.json](vercel.json) sets the
Vite build, the SPA rewrite and long-lived caching for hashed `/assets`. The API and database
run on a VPS (see the backend's [docs/deploy-vps.md](https://github.com/zawy2004/StreetBiz-BE/blob/develop/docs/deploy-vps.md)).

Set these in *Vercel → Settings → Environment Variables*, then redeploy, because `VITE_*` values
are baked in at build time:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://<api-domain>/api`. Must be HTTPS: the build refuses localhost or plain HTTP on Vercel |
| `VITE_APP_ENV` | `production` |
| `VITE_GOONG_MAPTILES_KEY`, `VITE_CARTO_API_KEY` | Optional |

The API must allow the site's origin (`Cors__AllowedOrigins__N` in the VPS `api.env`).
`Permit__PublicScanBaseUrl` must point at the same domain so printed QR codes open this site.

## Documentation

| Document | Contents |
| --- | --- |
| [architecture.md](docs/architecture.md) | Client architecture |
| [project-structure.md](docs/project-structure.md) | Folder conventions |
| [role-permission-matrix.md](docs/role-permission-matrix.md) | Who can see what |
| [route-plan.md](docs/route-plan.md) | Use case to screen mapping |
| [api-integration-plan.md](docs/api-integration-plan.md) | Backend integration |
| [phase-boundary.md](docs/phase-boundary.md) | Core and Phase 2 scope |
| [ward-slot-workflows.md](docs/ward-slot-workflows.md) · [community-vendor-workflows.md](docs/community-vendor-workflows.md) · [commerce-order-workflows.md](docs/commerce-order-workflows.md) · [fee-payment-workflows.md](docs/fee-payment-workflows.md) · [platform-administration-workflows.md](docs/platform-administration-workflows.md) | Feature workflows |

---

<div align="center">
<sub>StreetBiz is a capstone project. The API and mobile app live in their own repositories.</sub>
</div>
