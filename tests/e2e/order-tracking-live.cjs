/* global require, process, console, fetch */
/* The globals below appear inside addInitScript bodies, which run in the page. */
/* global localStorage */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check for ORD-02 order tracking and the ORD-01 pickup range, on a phone-sized
// screen with an emulated GPS position. Moves an order through the seller's workflow and puts an
// item in the buyer's cart, so point it at a disposable database (scripts/setup-local-db.ps1).
//
//   E2E_ALLOW_DB_MUTATION=1 \
//   PLAYWRIGHT_MODULE_PATH=<path to playwright> \
//   E2E_ORDER_ID=<a paid order in PLACED, at storefront 2> \
//   E2E_ARTIFACTS=<screenshot folder> \
//   node tests/e2e/order-tracking-live.cjs
//
// The UI must talk to the same API, e.g. VITE_API_BASE_URL=http://localhost:5023/api npx vite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const api = process.env.E2E_API_URL || 'http://localhost:5023/api';
const ui = process.env.E2E_UI_URL || 'http://localhost:5173';
const output = process.env.E2E_ARTIFACTS;
const orderId = process.env.E2E_ORDER_ID;
const password = process.env.E2E_PASSWORD || 'Password123!';
const buyerPhone = process.env.E2E_CUSTOMER_PHONE || '0905000201';
const sellerPhone = process.env.E2E_VENDOR_PHONE || '0905000101';
// Storefront 2 in the demo seed (Bún chả Hải Châu, 45 Nguyễn Văn Linh) and menu item 7 on it.
const stall = { latitude: 16.061026, longitude: 108.21874 };
const menuItemId = Number(process.env.E2E_MENU_ITEM_ID || 7);
const north = (meters) => ({ ...stall, latitude: stall.latitude + meters / 111_195, accuracy: 12 });
// 390 is a common phone; E2E_VIEWPORT_WIDTH=360 checks the narrowest one still in wide use.
const width = Number(process.env.E2E_VIEWPORT_WIDTH || 390);

assert.equal(
  process.env.E2E_ALLOW_DB_MUTATION,
  '1',
  'Set E2E_ALLOW_DB_MUTATION=1 for a disposable database.',
);
assert.ok(orderId, 'Missing E2E_ORDER_ID');
assert.ok(output, 'Missing E2E_ARTIFACTS');
fs.mkdirSync(output, { recursive: true });

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : ' -- ' + detail));
  if (!ok) failures.push(name);
}

async function call(token, method, route, body) {
  const response = await fetch(api + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
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
        },
      },
      version: 0,
    }),
  );
}

async function phone(browser, session, position, colorScheme = 'light') {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    deviceScaleFactor: 2,
    timezoneId: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
    colorScheme,
    geolocation: position,
    permissions: ['geolocation'],
  });
  await context.addInitScript(signIn, session);
  return context;
}

const shot = (page, name) => page.screenshot({ path: path.join(output, name), fullPage: true });

(async () => {
  const buyer = await login(buyerPhone);
  const seller = await login(sellerPhone);
  const tracking = await call(buyer.accessToken, 'GET', `/orders/${orderId}/tracking`);
  assert.equal(tracking.status, 200, JSON.stringify(tracking.body));
  assert.equal(tracking.body.orderStatus, 'PLACED', 'E2E_ORDER_ID must be a paid order in PLACED');

  const browser = await chromium.launch();

  // ---- ORD-02: one order through the seller's workflow, watched by the buyer ----
  const buyerContext = await phone(browser, buyer, north(70));
  const page = await buyerContext.newPage();
  await page.goto(`${ui}/customer/orders/${orderId}`, { waitUntil: 'networkidle' });
  await page.getByText('Đang chờ quán nhận đơn').waitFor();
  check('PLACED: the usual preparation time is given before the stall accepts',
    await page.getByText(/Quán thường làm xong trong (khoảng )?\d+(–\d+)? phút/).isVisible());
  await page.getByText(/Cách bạn \d+\sm/).waitFor();
  check('the pickup card follows the buyer and offers directions',
    await page.getByRole('link', { name: 'Chỉ đường' }).isVisible());
  // Let the 260 ms settle-in animation finish, so screenshots show the resting state.
  await page.waitForTimeout(600);
  await shot(page, '01-tracking-placed.png');
  await page.getByRole('link', { name: 'Chỉ đường' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, '01b-pickup-card.png') });

  const advance = async (route, headline, file) => {
    const result = await call(seller.accessToken, 'POST', `/vendor/orders/${orderId}${route}`);
    assert.equal(result.status, 200, route + ': ' + JSON.stringify(result.body));
    // No reload: the screen must change on the realtime push (or its polling fallback).
    await page.getByText(headline).waitFor({ timeout: 15_000 });
    // The screen scrolls inside its own container; bring the progress card back into view.
    await page.getByText(headline).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(600);
    await shot(page, file);
  };
  await advance('/accept', 'Quán đã nhận đơn và sắp bắt đầu làm', '02-tracking-accepted.png');
  check('ACCEPTED: a clock-time window replaces the duration',
    await page.getByText(/Dự kiến sẵn sàng (khoảng )?\d{2}:\d{2}/).isVisible());
  await advance('/preparing', 'Quán đang chuẩn bị món của bạn', '03-tracking-preparing.png');
  check('the current step is marked for assistive technology',
    (await page.locator('[aria-current="step"]').innerText()).includes('Đang làm'));
  await advance('/ready-for-pickup', 'Món đã sẵn sàng, mời bạn đến quầy lấy', '04-tracking-ready.png');
  check('READY: the buyer is nudged without reloading',
    await page.getByText('Món của bạn đã sẵn sàng. Mời bạn đến quầy lấy món!').isVisible());

  const dark = await phone(browser, buyer, north(70), 'dark');
  const darkPage = await dark.newPage();
  await darkPage.goto(`${ui}/customer/orders/${orderId}`, { waitUntil: 'networkidle' });
  await darkPage.getByText('Món đã sẵn sàng, mời bạn đến quầy lấy').waitFor();
  await darkPage.waitForTimeout(600);
  await shot(darkPage, '05-tracking-ready-dark.png');

  // ---- ORD-01: the checkout follows the buyer's distance ----
  const added = await call(buyer.accessToken, 'POST', '/cart/items', { menuItemId, quantity: 1 });
  assert.equal(added.status, 200, 'add to cart: ' + JSON.stringify(added.body));
  const far = await phone(browser, buyer, north(3400));
  const checkout = await far.newPage();
  await checkout.goto(`${ui}/customer/checkout`, { waitUntil: 'networkidle' });
  await checkout.getByText(/Bạn đang cách quán 3,4\skm/).waitFor();
  const pay = checkout.getByRole('button', { name: 'Thanh toán và đặt món' });
  check('too far: ordering is blocked and the reason is given', await pay.isDisabled());
  await checkout.waitForTimeout(600);
  await shot(checkout, '06-checkout-too-far.png');

  // The buyer walks closer: the same screen updates from the position watch, no reload.
  await far.setGeolocation(north(650));
  await checkout.getByText(/Bạn cách quán 6\d\d\sm/).waitFor({ timeout: 15_000 });
  check('within range: ordering opens up', await pay.isEnabled());
  await checkout.waitForTimeout(600);
  await shot(checkout, '07-checkout-within-range.png');

  // ---- ORD-01 early: the storefront page, once discovery knows where the buyer is ----
  const explore = await far.newPage();
  await far.setGeolocation(north(3400));
  await explore.goto(`${ui}/customer/explore`, { waitUntil: 'networkidle' });
  await explore.getByRole('button', { name: 'Tìm quanh tôi' }).click();
  await explore.getByRole('button', { name: 'Cập nhật vị trí' }).waitFor();
  await explore.getByText('Bún chả Hải Châu').first().click();
  await explore.getByText(/Ngoài phạm vi đặt món/).waitFor();
  check('a storefront page warns before anything goes into the cart', true);
  await shot(explore, '08-storefront-out-of-range.png');

  // Leave the cart as it was.
  await call(buyer.accessToken, 'DELETE', '/cart');
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
