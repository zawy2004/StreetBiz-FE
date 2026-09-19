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

The status chips use Backend values: `PENDING_PAYMENT`, `PLACED`, `ACCEPTED`,
`PREPARING`, `READY_FOR_PICKUP`, `COMPLETED`, `REJECTED` and `CANCELLED`.
Optimistic commands send the currently displayed status as `expectedStatus`; a
concurrent update is shown as an API conflict instead of silently overwriting it.

## Development payment flow

Use these values only with a Development Backend:

```dotenv
VITE_USE_MOCK_API=false
VITE_ENABLE_PAYMENT_SANDBOX=true
```

Checkout first creates `PENDING_PAYMENT`, then calls the development-only
sandbox confirmation endpoint and receives `PLACED`. Set the flag to `false` in
non-development builds. The live checkout button stays disabled outside this
development sandbox so it cannot create an unpayable pending order. A real
deployment must implement the MOMO/ZaloPay redirect and signed callback before
enabling production checkout.

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
