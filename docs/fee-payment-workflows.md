# Live fee, penalty, invoice and reporting workflows

FEE-01–05, WARD-14 and WARD-15 use StreetBiz-BE when `VITE_USE_MOCK_API=false`.
See StreetBiz-BE's `docs/fee-payment-invoicing.md` for the backend side
(SYS-03–06, FEE-01–05, WARD-14/15) this module talks to.

## Configuration

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://localhost:7147/api
```

Run the backend with its `https` launch profile, then `npm run dev`. Without
MoMo keys the backend's Development sandbox (`Payments:SandboxEnabled`) confirms
payments instantly; with MoMo test keys (see the backend doc) the vendor pays on
MoMo's real test page.

## Routes

| Role | Route | Purpose |
| --- | --- | --- |
| Vendor | `/vendor/finance` | FinanceHome: summary card with a "pay the most urgent" action; Fees tab (unpaid instalments by urgency, then each contract's progress), Penalties, Invoices (by month, filterable); yearly statement download. |
| Vendor | `/vendor/finance/contracts/:id` | One contract's fee schedule: progress, every instalment with its due badge, pay or open its invoice. |
| Vendor | `/vendor/finance/fees/:id/payment` | FEE-01: pay one fee instalment (slot, period, due badge, contract progress); after paying, a receipt with the invoice, view/PDF, and the next instalment. Also MoMo's return page. |
| Vendor | `/vendor/finance/penalties/:id/payment` | FEE-04: pay one penalty; also MoMo's return page for it. |
| Vendor | `/vendor/finance/invoices` | FEE-03: invoice list. |
| Vendor | `/vendor/finance/invoices/:id` | FEE-03: invoice detail and PDF receipt download. |
| Vendor | `/vendor/finance/payments` | FEE-05: payment attempts — instalment/violation, slot, provider, time, status. |
| Vendor | `/vendor/finance/violations` | FEE-05: violations recorded against the vendor. |
| Ward | `/ward/dashboard` | WARD-15: occupancy, pending queue, revenue collected, amount still owed, violations needing action. |
| Ward | `/ward/reports` | WARD-14: this month / last month / 90 days / a custom range; collected, on-time rate, still owed, overdue households; 6-month chart; zones; recent violations; Excel export. |
| Ward | `/ward/reports/debtors` | WARD-14: households with overdue fees, most overdue first, with a call link and a once-a-day "Nhắc nợ". |

Urgency on the vendor side is said in words ("Quá hạn 5 ngày", "Còn 3 ngày") and only overdue is
red; an instalment more than a week off carries no chip, only its date, and its pay button is the
quiet outline one. The ward's trend chart stacks fees and penalties per month in the validated
`--c-series-1/2` tokens (never the status colours), labels only the latest month, and every value
is in its tooltip (hover or keyboard focus) and in its "Xem bảng số liệu" table.

Instalments are paid in order: the schedule marks the oldest unpaid one `payableNow`; the others say
"Sau kỳ trước" instead of offering a button. An instalment the contract's early end cancelled reads
"Đã huỷ", is greyed, and is in neither the total nor the count. A payment received for something
already paid is "Chờ hoàn tiền" (then "Đã hoàn tiền") in the payment history.

The ward's report (`ReceivablesPanel`) adds the overdue fees by age (1–30, 31–60, over 60 days), the
next 30 days, and the payments owed back, each with "Đã hoàn tiền" to record the repayment.

After a payment every `finance` query is cancelled before it is invalidated: back from MoMo, the
page's first read of the instalment can start before the sync applied the payment, and a plain
invalidation would only wait for that stale read.

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
- `POST /vendor/finance/payments/{transactionId}/sync` — back from MoMo, the
  backend asks MoMo for the real state and applies it.
- `GET /vendor/finance/payments`, `GET /vendor/finance/violations`,
  `GET /vendor/finance/invoices`, `GET /vendor/finance/invoices/{id}`.
- `GET /vendor/finance/invoices/{id}/pdf` — the receipt as a PDF.
- `GET /ward/reports/collection?from=&to=`, `GET /ward/dashboard`.
- `GET /ward/reports/collection/export?from=&to=` — the report as `.xlsx`.

The two file endpoints need the bearer token, so they are fetched as a `Blob`
(`apiGetBlob`) and handed to the browser with `saveFile`
(`src/core/utils/save-file.ts`) rather than linked. In the mock build both
buttons explain that downloads need the server.

## Payment confirmation

Fee and penalty payments share Commerce's MoMo gateway on the backend.
`FeePaymentScreen`/`PenaltyPaymentScreen` look at the `paymentUrl` checkout
returns:

- **A real MoMo page** (`https://test-payment.momo.vn/...`): the screen
  remembers the transaction (`rememberFinancePayment`) and redirects. MoMo sends
  the vendor back to the same payment route with its own query string;
  `useFinancePaymentReturn` reads the transaction from MoMo's `orderId`
  (`SB-T{transactionId}-{8 hex}`, fresh per attempt because MoMo refuses a
  repeated one) and calls `sync`. The query string's `resultCode` is never
  trusted. `SUCCESS` returns to FinanceHome; `PENDING` shows "Kiểm tra lại";
  `FAILED` shows MoMo's reason.
- **A sandbox URL** (`streetbiz://payment/sandbox/...`, no MoMo keys): the
  screen calls `sandbox-confirm` right away and returns to FinanceHome; if that
  404s (not Development) it falls back to `redirectToPayment`.
- **A SePay bank transfer** (the checkout carries `bankTransfer`): there is no
  page to leave for. `useFinanceBankTransfer` keeps `BankTransferPanel` (the
  VietQR, the account and the transfer content, each copyable) on the page and
  calls `sync` every 5 seconds; SePay's webhook settles the payment on the
  backend, and `SUCCESS` returns to FinanceHome. The transaction is remembered
  in `sessionStorage`, so a reload fetches the same QR again
  (`GET /vendor/finance/payments/{id}/bank-transfer`). Orders do the same on
  `OrderPaymentScreen` (`GET /orders/{id}/payment/bank-transfer`). Backend setup:
  StreetBiz-BE `docs/sepay-payments.md`.
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

The contract schedules work in the demo build too (built from the mock database by the same rules
as the server, `buildSchedules`); the ward's on-time rate, trend, zones and debtors need the live
API, since the demo database keeps no payment dates, and say so instead of showing made-up figures.

`tests/e2e/finance-live.cjs` is an opt-in browser check of the ward report, debtors and reminder,
the vendor schedule, a sandbox payment to its receipt and invoice, and the "Tôi đang đến" notice.

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
gateway redirect, the MoMo redirect and return (`sync`, including the
per-attempt `orderId`), key reuse across a retry, the payment-history row, the
report's period boundaries, and both file downloads.

## Testing notes

Use disposable accounts and a test database for live end-to-end payment
testing: checkout, sync and sandbox-confirm write `PaymentTransactions`,
`PaymentCallbackEvents`, `FeeScheduleItems`/`Penalties` status and `Invoices`
rows.
