# Live cart and order workflows

CART-01, ORD-01–04 and SORD-01–04 use StreetBiz-BE when
`VITE_USE_MOCK_API=false`. The production-facing order screens do not create
mock orders or simulate payment success in the browser.

## Configuration

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://localhost:7147/api
```

Run the backend with its `https` launch profile, then run `npm run dev`. Trust
the local ASP.NET development certificate if the browser rejects it. The API
must allow the Vite origin (normally `http://localhost:5173`) in CORS.

## Routes

| Role | Route | Purpose |
| --- | --- | --- |
| Customer | `/customer/explore/cart` | CART-01: update/remove/clear cart items. |
| Customer | `/customer/checkout` | ORD-01: choose MoMo/ZaloPay and create an idempotent checkout. |
| Customer | `/orders` or `/customer/orders` | ORD-02: paged order history and status filters. |
| Customer | `/orders/:orderId` or `/customer/orders/:orderId` | ORD-02–04: detail, cancel PLACED order, confirm READY pickup. |
| Customer | `/customer/orders/:orderId/payment` | Read backend payment/order state after redirect; never marks payment successful locally. |
| Vendor | `/vendor/orders` or `/vendor/store/orders` | SORD-01–03: paged queue and state-dependent commands. |
| Vendor | `/vendor/orders/:orderId` | SORD-01–03: vendor order detail and status timeline. |
| Vendor | `/vendor/orders/sales-summary` or `/vendor/store/sales` | SORD-04: day/week/month sales summary. |

Customer and vendor detail views subscribe to `/hubs/orders` for their current
order. The hub checks customer/vendor ownership before joining its group. If the
connection is unavailable, detail views poll every seven seconds while the order
is non-terminal. `COMPLETED`, `REJECTED` and `CANCELLED` stop both mechanisms.
List screens use manual refresh and query invalidation after mutations.

## API contract

- `POST /api/orders/checkout` with `{ cartId, provider, location }` and a stable
  `Idempotency-Key` header generated once per cart checkout attempt. `location`
  is the position the checkout screen judged (see "Pickup range and tracking").
- `GET /api/orders/{id}/tracking`,
  `GET /api/marketplace/storefronts/{id}/pickup-range`.
- `GET /api/orders/me`, `GET /api/orders/{id}`.
- `POST /api/orders/{id}/cancel`,
  `POST /api/orders/{id}/confirm-pickup`.
- `GET /api/vendor/orders`, `GET /api/vendor/orders/{id}`.
- Vendor commands: `accept`, `reject`, `preparing`, `ready-for-pickup`, and
  `confirm-handover` under `/api/vendor/orders/{id}/...`.
- `GET /api/vendor/orders/sales-summary?fromDate=...&toDate=...&groupBy=...`.

Checkout immediately follows the backend-provided `paymentUrl`. Query-string
values on a return URL are informational only; the browser continues to show
pending until the server-side provider callback updates the order. A failed
checkout request may be retried with the same idempotency key. A new key is
created only when the cart changes or the page starts a checkout for another
cart.

HTTP 409 responses are treated as concurrent state conflicts: the affected
queries are invalidated/refetched and the user sees a conflict message. Vendor
rejection requires a non-empty reason of at most 500 characters. Cancellation
and rejection show refund data reported by the backend without promising that
the provider has completed the refund.

## Pickup range and tracking (ORD-01, ORD-02)

Orders are pickup-only, so a customer may only order within the stall's pickup
range (default 2 km; StreetBiz-BE `docs/order-tracking-pickup-range.md`).

- **Checkout** (`usePickupRange`, `PickupRangeNotice`): follows the customer's
  position with `watchPosition` while the page is visible, judges it with the
  same rule the server applies (`pickup/pickup-range.ts`, same test cases as the
  backend) and keeps the pay button disabled until the customer is within range.
  Every blocked state says why and how to fix it: allow location, enable GPS, or
  walk closer (with directions). The server re-checks the very position sent.
- **Storefront page** (`OutOfRangeHint`): a quiet note when discovery already
  knows the customer is beyond the range. It never asks for location itself.
- **Order detail** (`OrderProgressCard`, `PickupPointCard`): a five-step tracker
  (placed → accepted → preparing → ready → collected) with times, the stall's
  ready-time estimate and the queue ahead from `GET /orders/{id}/tracking`, and
  live walking distance plus directions while the order is collectable. Distance
  is only followed if location was allowed before; otherwise a button offers it.
  The full status log stays in a collapsed "Lịch sử cập nhật". A short toast and
  vibration mark the moment the order turns ready while the page is open.
- **"Tôi đang đến"** (`PickupPointCard`): tells the stall the customer is on the
  way, with the walking ETA when the distance is known; afterwards the card says
  when the stall was told. The seller's ticket and order detail show "Khách đang
  đến" (`useVendorArrivals`, refreshed with the board every 20 s) with a "Đã thấy" button
  (`ArrivalBanner`); once answered, the customer's card reads "Quán đã thấy tin bạn đang đến". The
  customer can send at most 3 notices per order, after which "Báo lại" is gone.
- **Order list** (`OrderProgressStrip` in `OrderCard`): orders in progress show
  five thin segments and one line of what is happening.
- **Cart** (`CartRangeHint`): if discovery already knows the customer is beyond
  the range, the cart says so before the pay button; it never asks for location.

Positions are kept in memory only, never in storage. Animations are a slow pulse
on the current step and a 260 ms settle-in on changed text, both off under
`prefers-reduced-motion`.

`tests/e2e/order-tracking-live.cjs` is an opt-in browser check on a 390×844
screen with an emulated GPS position (see its header for the environment).

## Quality checks

```powershell
npm install
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

The automated suite covers the checkout idempotency header, canonical API
paths, role-specific actions, rejection validation, duplicate checkout clicks,
server-authoritative payment return behavior, conflict refresh, VND formatting,
terminal polling, SignalR URL derivation and payment redirection.

## Current backend dependencies

- StreetBiz-BE must return `paymentUrl` and receive/verify payment provider
  callbacks; the frontend intentionally has no success/failure simulation.
- A real MoMo/ZaloPay adapter, signed callback verification, reconciliation and
  production refund processing are backend/infrastructure responsibilities.
- Cart responses expose the current registration address. New orders persist and
  return an immutable storefront address snapshot; migrated orders are backfilled
  where their registration has a declared address.
- SignalR is the primary order-detail update mechanism. Seven-second polling is
  retained automatically as the reconnect/failure fallback.

Use disposable accounts and a test database for live end-to-end checkout,
because it writes cart, order, payment, history, notification and audit data.
