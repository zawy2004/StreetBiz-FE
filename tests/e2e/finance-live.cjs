/* global require, process, console, fetch */
/* The globals below appear inside addInitScript bodies, which run in the page. */
/* global localStorage */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check for the fee/invoice/report upgrades and the "Tôi đang đến" notice:
//   ward  — collection report (on-time rate, trend chart, zones), debtors, a debt reminder;
//   vendor — finance home, a contract's schedule, paying an overdue instalment through the local
//            sandbox (ZaloPay), the receipt, the invoice, the grouped invoice list;
//   buyer → seller — "Tôi đang đến" on an accepted order, seen on the seller's ticket.
// Pays a fee, sends a reminder and creates an order, so point it at a freshly built database
// (scripts/setup-local-db.ps1 -Recreate) whose demo vendor has an overdue instalment.
//
//   E2E_ALLOW_DB_MUTATION=1 PLAYWRIGHT_MODULE_PATH=<path to playwright> \
//   E2E_ARTIFACTS=<screenshot folder> node tests/e2e/finance-live.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const api = process.env.E2E_API_URL || 'http://localhost:5023/api';
const ui = process.env.E2E_UI_URL || 'http://localhost:5173';
const output = process.env.E2E_ARTIFACTS;
const password = process.env.E2E_PASSWORD || 'Password123!';
// Storefront 2 in the demo seed and a dish on it, for the arrival check.
const stall = { latitude: 16.061026, longitude: 108.21874 };
const near = (meters) => ({ ...stall, latitude: stall.latitude + meters / 111_195, accuracy: 10 });

assert.equal(process.env.E2E_ALLOW_DB_MUTATION, '1', 'Set E2E_ALLOW_DB_MUTATION=1 for a disposable database.');
assert.ok(output, 'Missing E2E_ARTIFACTS');
fs.mkdirSync(output, { recursive: true });

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : ' -- ' + detail));
  if (!ok) failures.push(name);
}

async function call(token, method, route, body, headers = {}) {
  const response = await fetch(api + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const login = async (phoneNumber) => {
  const { status, body } = await call(null, 'POST', '/auth/login', { phoneNumber, password });
  assert.equal(status, 200, 'login ' + phoneNumber + ': ' + JSON.stringify(body));
  return body;
};

/** Seeds a session into a fresh context, as the app stores it after signing in. */
function signIn(session) {
  localStorage.setItem('streetbiz-tokens', JSON.stringify(session));
  const u = session.user;
  localStorage.setItem(
    'streetbiz-auth',
    JSON.stringify({
      state: {
        user: {
          id: String(u.userId),
          fullName: u.fullName,
          phone: u.phoneNumber,
          password: '',
          role_code: u.roleCode,
          account_status: u.accountStatus,
          wardUnitId: u.wardUnitId,
        },
      },
      version: 0,
    }),
  );
}

async function context(browser, session, { width = 390, height = 844, geolocation } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    timezoneId: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
    ...(geolocation ? { geolocation, permissions: ['geolocation'] } : {}),
  });
  await ctx.addInitScript(signIn, session);
  return ctx;
}

const shot = (page, name) => page.screenshot({ path: path.join(output, name), fullPage: true });
const settle = (page) => page.waitForTimeout(600);

(async () => {
  const ward = await login(process.env.E2E_WARD_PHONE || '0983000001');
  const vendor = await login(process.env.E2E_VENDOR_PHONE || '0905000101');
  const buyer = await login(process.env.E2E_CUSTOMER_PHONE || '0905000201');
  const browser = await chromium.launch();

  // ---- Ward: the collection report and its debtors (before the vendor pays) ----
  const wardCtx = await context(browser, ward, { width: 1280, height: 900 });
  const report = await wardCtx.newPage();
  await report.goto(`${ui}/ward/reports`, { waitUntil: 'networkidle' });
  await report.getByText('Nộp phí đúng hạn').waitFor();
  check('the report leads with the on-time rate and the overdue households',
    await report.getByText('Hộ nợ quá hạn').first().isVisible());
  await report.getByRole('button', { name: /T\d+\/\d+: phí thuê ô/ }).first().waitFor();
  check('the monthly chart is drawn, one focusable column per month',
    (await report.getByRole('button', { name: /T\d+\/\d+: phí thuê ô/ }).count()) === 6);
  check('collections are broken down by zone', await report.getByText('Theo khu vực').isVisible());
  await report.getByRole('button', { name: /T\d+\/\d+: phí thuê ô/ }).nth(4).hover();
  await settle(report);
  await shot(report, '10-ward-report.png');

  await report.getByRole('button', { name: /Xem tất cả .* hộ và nhắc nợ/ }).click();
  await report.getByRole('button', { name: /^(Nhắc nợ|Đã nhắc hôm nay)$/ }).first().waitFor();
  await shot(report, '11-ward-debtors.png');
  // Re-runnable on the same day: a household already reminded today is simply left as it is.
  if (await report.getByRole('button', { name: 'Nhắc nợ' }).count()) {
    await report.getByRole('button', { name: 'Nhắc nợ' }).first().click();
  }
  await report.getByRole('button', { name: 'Đã nhắc hôm nay' }).first().waitFor();
  check('a reminder is sent once, then the button says so', true);
  const again = await call(ward.accessToken, 'POST', '/ward/reports/debtors/1/remind');
  check('the server refuses a second reminder the same day', again.status === 409, JSON.stringify(again.body));
  await settle(report);
  await shot(report, '12-ward-debtors-reminded.png');

  // ---- Vendor: finance home, schedule, paying an overdue instalment, receipt, invoice ----
  const vendorCtx = await context(browser, vendor);
  const page = await vendorCtx.newPage();
  await page.goto(`${ui}/vendor/finance`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Cần thanh toán' }).waitFor();
  check('finance home puts what is owed first, most urgent at the top',
    (await page.getByText(/quá hạn \d+ ngày/i).count()) > 0);
  await settle(page);
  await shot(page, '13-vendor-finance-home.png');

  await page.getByRole('button', { name: /^Ô NVL-01/ }).click();
  await page.getByRole('list', { name: 'Các kỳ phí' }).waitFor();
  check('a contract schedule lists every instalment with progress',
    (await page.getByRole('progressbar').count()) === 1);
  await settle(page);
  await shot(page, '14-contract-schedule.png');

  await page.getByRole('button', { name: 'Thanh toán', exact: true }).first().click();
  await page.getByText(/Hợp đồng đã nộp \d+\/\d+ kỳ/).waitFor();
  await settle(page);
  await shot(page, '15-fee-payment.png');
  // ZaloPay runs through the local sandbox; MoMo would leave for MoMo's real test page.
  await page.getByText('ZaloPay', { exact: true }).click();
  await page.getByRole('button', { name: 'Thanh toán qua MoMo / ZaloPay' }).click();
  await page.locator('p', { hasText: 'Thanh toán thành công' }).waitFor({ timeout: 15_000 });
  check('after paying the vendor sees a receipt with the invoice it produced',
    await page.getByText(/^HD-\d{4}-\d{6}$/).isVisible());
  await settle(page);
  await shot(page, '16-payment-receipt.png');

  await page.getByRole('button', { name: 'Xem hoá đơn' }).click();
  await page.getByText(/Bằng chữ:/).waitFor();
  check('the invoice screen shows what the PDF prints, amount in words included',
    await page.getByText('Người nộp').isVisible());
  await settle(page);
  await shot(page, '17-invoice-detail.png');

  await page.goto(`${ui}/vendor/finance/invoices`, { waitUntil: 'networkidle' });
  await page.getByText(/hoá đơn năm \d{4}/).waitFor();
  await settle(page);
  await shot(page, '18-invoice-list.png');

  // ---- Buyer → seller: "Tôi đang đến" ----
  const added = await call(buyer.accessToken, 'POST', '/cart/items', { menuItemId: 7, quantity: 1 });
  assert.equal(added.status, 200, 'add to cart: ' + JSON.stringify(added.body));
  const order = await call(buyer.accessToken, 'POST', '/orders/checkout',
    { cartId: added.body.cartId, provider: 'ZALOPAY', location: { latitude: near(70).latitude, longitude: stall.longitude, accuracyMeters: 10 } },
    { 'Idempotency-Key': 'finance-live-' + Date.now() });
  assert.equal(order.status, 200, 'checkout: ' + JSON.stringify(order.body));
  const orderId = order.body.orderId;
  await call(buyer.accessToken, 'POST', `/orders/${orderId}/payment/sandbox-confirm`);
  const accepted = await call(vendor.accessToken, 'POST', `/vendor/orders/${orderId}/accept`);
  assert.equal(accepted.status, 200, 'accept: ' + JSON.stringify(accepted.body));

  const buyerCtx = await context(browser, buyer, { geolocation: near(600) });
  const buyerPage = await buyerCtx.newPage();
  await buyerPage.goto(`${ui}/customer/orders/${orderId}`, { waitUntil: 'networkidle' });
  await buyerPage.getByRole('button', { name: 'Tôi đang đến' }).click();
  await buyerPage.getByText(/Đã báo quán bạn đang đến lúc \d{2}:\d{2}/).waitFor();
  check('the buyer tells the stall they are on the way', true);
  await buyerPage.getByText(/Đã báo quán bạn đang đến lúc/).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settle(buyerPage);
  await buyerPage.screenshot({ path: path.join(output, '19-buyer-on-my-way.png') });

  await buyerPage.goto(`${ui}/customer/orders`, { waitUntil: 'networkidle' });
  await buyerPage.getByRole('img', { name: /bước \d\/5/ }).first().waitFor();
  check('the order list shows how far along an order in progress is', true);
  await settle(buyerPage);
  await shot(buyerPage, '20-buyer-order-list.png');

  const board = await vendorCtx.newPage();
  await board.goto(`${ui}/vendor/orders`, { waitUntil: 'networkidle' });
  await board.getByRole('tab', { name: /Đã nhận/ }).click();
  await board.getByText('Khách đang đến').first().waitFor({ timeout: 25_000 });
  check('the seller sees the customer on the way on the ticket', true);
  await settle(board);
  await shot(board, '21-seller-ticket-arriving.png');

  await browser.close();
  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed. Screenshots in ' + output);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
