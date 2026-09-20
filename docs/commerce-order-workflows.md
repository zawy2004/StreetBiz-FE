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

- `POST /api/orders/checkout` with `{ cartId, provider }` and a stable
  `Idempotency-Key` header generated once per cart checkout attempt.
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
