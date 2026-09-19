# Live cart and order screens

The live React Query integration covers CART-01, ORD-01–04 and SORD-01–04. Set
`VITE_USE_MOCK_API=false` and start StreetBiz-BE before the Vite app.

## Routes

| Role           | Route                             | Use case                                                                                          |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| Guest/customer | `/customer/explore/search`        | Search live marketplace menu items.                                                               |
| Guest/customer | `/customer/explore/items/:itemId` | View a menu item; active customers can add it with quantity/note.                                 |
| Customer       | `/customer/explore/cart`          | View, change, remove or clear cart items.                                                         |
| Customer       | `/customer/checkout`              | Select MOMO/ZALOPAY and create an idempotent prepaid order.                                       |
| Customer       | `/customer/orders`                | Track owned orders; refreshes every 10 seconds.                                                   |
| Customer       | `/customer/orders/:orderId`       | View status/payment history, cancel eligible orders or confirm pickup; refreshes every 5 seconds. |
| Vendor         | `/vendor/store/orders`            | Accept/reject and advance owned paid orders; refreshes every 5 seconds.                           |
| Vendor         | `/vendor/store/sales`             | View current day/week/month gross sales, successful refunds and net sales.                        |
| Vendor         | `/vendor/store`                   | Create/update owned storefronts using an eligible rental contract. |
| Vendor         | `/vendor/store/menu`              | Live menu creation, editing, sold-out toggle and archive. |
| Customer       | `/customer/orders/:orderId/payment` | Sandbox success/failure/retry; resume the same pending order after reload. |
| Customer       | `/customer/orders/:orderId/review` | Read/update a rating for a completed order. |
| Customer       | `/customer/orders/:orderId/complaint` | Submit complaint/refund request and track admin resolution. |

The status chips use Backend values: `PENDING_PAYMENT`, `PLACED`, `ACCEPTED`,
`PREPARING`, `READY_FOR_PICKUP`, `COMPLETED`, `REJECTED` and `CANCELLED`.
Optimistic commands send the currently displayed status as `expectedStatus`; a
concurrent update is shown as an API conflict instead of silently overwriting it.

## Development payment flow

Use these values only with a Development Backend:

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:5023/api
```

Backend must run in Development with `Payments:SandboxEnabled=true`.
The browser reads `/orders/payment-options`; the old VITE sandbox flag is no
longer used by live checkout. Checkout creates `PENDING_PAYMENT`, then navigates
to a payment page. Simulation can succeed or fail; a failed payment can be
retried on the same order, including after reload. Order details offer a
"Tiếp tục thanh toán" action for unpaid orders. The idempotency key is stable
per customer/cart. Payment simulation never contacts a real gateway.

The live checkout button remains disabled when the server reports UNAVAILABLE.
Real MoMo/ZaloPay adapters, signed callbacks, reconciliation and refunds are
still required before production checkout can be enabled.

Cancel/reject screens read the latest refund amount, reason, requested time and
status from Backend. They distinguish `PENDING`, `SUCCESS` and `FAILED` instead
of claiming that money was returned before the provider confirms it.

## Checks

```powershell
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Use a disposable customer/database for manual end-to-end checkout because it
creates real cart, order, payment, history, notification and audit records.

### Optional live browser smoke test

`tests/e2e/commerce-live.cjs` uses Playwright against running FE/BE servers.
It is opt-in, **mutates the selected test database**, and is not run by Vitest.
Provide a vendor with an approved registration/current contract, a customer
and platform admin; use disposable accounts with the same test password.
Install Playwright separately or set PLAYWRIGHT_MODULE_PATH to an existing
Playwright module directory (with Chromium installed).

Required environment variables:

- E2E_ALLOW_DB_MUTATION=1
- E2E_VENDOR_PHONE, E2E_CUSTOMER_PHONE, E2E_ADMIN_PHONE, E2E_PASSWORD
- E2E_CONTRACT_ID: vendor-owned eligible contract, with no store or an existing store
- E2E_ARTIFACTS: screenshot output directory outside the repository

Optional: E2E_API_URL (default http://127.0.0.1:5091/api),
E2E_UI_URL (default http://127.0.0.1:5173), E2E_FOREIGN_STOREFRONT_ID.
Ensure the configured frontend base URL points to that backend.

```powershell
node tests/e2e/commerce-live.cjs
```

The test covers store/menu creation, cart, checkout, failed-payment recovery
after reload, seller processing, pickup, review, complaint, admin resolution,
partial refund, paid cancellation/refund, repeated confirmation, menu archive
and sales. It captures mobile screenshots and checks page errors, UTC dates
and action-button height. Fixture rows remain for inspection; no broad cleanup
or production payment calls are performed.
