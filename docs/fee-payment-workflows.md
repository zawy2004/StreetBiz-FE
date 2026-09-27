# Live fee, penalty, invoice and reporting workflows

FEE-01–05, WARD-14 and WARD-15 use StreetBiz-BE when `VITE_USE_MOCK_API=false`.
See StreetBiz-BE's `docs/fee-payment-invoicing.md` for the backend side
(SYS-03–06, FEE-01–05, WARD-14/15) this module talks to.

## Configuration

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://localhost:7147/api
```

Run the backend with its `https` launch profile and `Payments:SandboxEnabled`
on (already the default in `appsettings.Development.json`), then run
`npm run dev`.

## Routes

| Role | Route | Purpose |
| --- | --- | --- |
| Vendor | `/vendor/finance` | FinanceHome: summary card + Fees/Penalties/Invoices tabs. |
| Vendor | `/vendor/finance/fees/:id/payment` | FEE-01: open a checkout for one fee instalment. |
| Vendor | `/vendor/finance/penalties/:id/payment` | FEE-04: open a checkout for one penalty. |
| Vendor | `/vendor/finance/invoices` | FEE-03: invoice list. |
| Vendor | `/vendor/finance/invoices/:id` | FEE-03: invoice detail. |
| Vendor | `/vendor/finance/payments` | FEE-05: payment attempts — instalment/violation, slot, provider, time, status. |
| Vendor | `/vendor/finance/violations` | FEE-05: violations recorded against the vendor. |
| Ward | `/ward/dashboard` | WARD-15: occupancy, pending queue, revenue collected, amount still owed, violations needing action. |
| Ward | `/ward/reports` | WARD-14: collection totals for this month / last month / the last 90 days, plus recent violations. |

The report's period is computed from the viewer's local calendar (Vietnamese
users), never with `toISOString()`, which is UTC and would still be
"yesterday" before 07:00. Outstanding debt on the report is a snapshot as of
now, not tied to the selected period.

## API contract

`src/core/api/finance-api.ts` (`financeApi`, `wardReportApi`):

- `GET /vendor/finance/summary`, `GET /vendor/finance/fees?status=`,
  `GET /vendor/finance/penalties?status=`.
- `POST /vendor/finance/fees/{id}/checkout`,
  `POST /vendor/finance/penalties/{id}/checkout` — both take a stable
  `Idempotency-Key` header generated once per checkout attempt and a body
  `{ provider: 'MOMO' | 'ZALOPAY' }`.
- `POST /vendor/finance/payments/{transactionId}/sandbox-confirm` —
  Development-only; see "Payment confirmation" below.
- `GET /vendor/finance/payments`, `GET /vendor/finance/violations`,
  `GET /vendor/finance/invoices`, `GET /vendor/finance/invoices/{id}`.
- `GET /ward/reports/collection?from=&to=`, `GET /ward/dashboard`.

## Payment confirmation

There is no real MoMo/ZaloPay sandbox account wired up (same as Commerce).
Checkout returns a `paymentUrl` on the `streetbiz://payment/sandbox/...`
custom scheme, which a desktop browser cannot navigate to. Rather than
stopping there, `FeePaymentScreen`/`PenaltyPaymentScreen` immediately call
`sandbox-confirm` for the transaction just opened:

- If sandbox confirmation is available (Development,
  `Payments:SandboxEnabled=true`), it applies the callback synchronously and
  the screen shows success and navigates back — the same experience the mock
  build gives with its 900ms fake delay.
- If the endpoint 404s (any other environment), the screen falls back to
  `redirectToPayment(paymentUrl)`, the same as Commerce checkout.
- Any other failure (typically `422`: the item was just paid from another tab)
  refreshes the list and summary so the item stops looking payable.

The `Idempotency-Key` is generated once per screen and kept across retries, so
a retry after a lost response replays the same transaction on the server
instead of opening a second one.

## Data source split

Every vendor screen reads through `src/features/fee-schedules/useFinance.ts`
and every ward screen through
`src/features/ward-administration/useWardReports.ts`. Each hook unifies a
live `useQuery` (enabled only when `isLiveApi`) with a mock derivation from
`useMockDb`, so `VITE_USE_MOCK_API=true` keeps demoing without a backend.
`FeePaymentScreen`/`PenaltyPaymentScreen` are the two exceptions — they use
the `isLiveApi ? <Live.../> : <Mock.../>` split (matching `CheckoutScreen`)
because checkout has a real side effect (opening a payment transaction) that
the instant mock `setTimeout` flow cannot share.

## Quality checks

```powershell
npm install
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

`tests/features/finance.test.tsx` covers the API paths and the
`Idempotency-Key` header, sandbox-confirm success, the 404 fallback to the
gateway redirect, key reuse across a retry, the payment-history row, and the
report's period boundaries.

## Current backend dependencies

- No PDF rendering for FEE-03 — "Tải hoá đơn (PDF)" stays a local-only toast,
  same as before this module was wired live.
- Use disposable accounts and a test database for live end-to-end payment
  testing: checkout and sandbox-confirm write `PaymentTransactions`,
  `PaymentCallbackEvents`, `FeeScheduleItems`/`Penalties` status and
  `Invoices` rows.
