/* global require, process, console, fetch, window, document, OscillatorNode, setTimeout, Event */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check that a seller's orders are live:
//   - a paid order reaches them in seconds, on any vendor screen, with a chime,
//     a toast and a badge - and a system notification when the tab is hidden;
//   - changes made elsewhere (another device accepting, the buyer cancelling)
//     show up without a reload;
//   - with the socket blocked, polling still brings the order in.
//
// Needs an API with Payments sandbox on. Places and pays its own orders, so
// point it at a disposable database.
//
//   E2E_ALLOW_DB_MUTATION=1 PLAYWRIGHT_MODULE_PATH=<path> E2E_ARTIFACTS=<dir> \
//   node tests/e2e/order-alerts-live.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const api = process.env.E2E_API_URL || 'http://localhost:5023/api';
const ui = process.env.E2E_UI_URL || 'http://localhost:5173';
const output = process.env.E2E_ARTIFACTS;
const password = process.env.E2E_PASSWORD || 'Password123!';
const buyerPhone = process.env.E2E_CUSTOMER_PHONE || '0905000201';
const sellerPhone = process.env.E2E_VENDOR_PHONE || '0905000101';
const storefrontId = Number(process.env.E2E_STOREFRONT_ID || 1);
/** Well under the 20s poll: arriving this fast means the socket carried it. */
const REALTIME_MS = 6_000;

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
  assert.ok(response.ok, `${method} ${route} -> ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const login = (phoneNumber) => call(null, 'POST', '/auth/login', { phoneNumber, password });

async function placePaidOrder(buyer) {
  const item = (await call(buyer, 'GET', `/marketplace/storefronts/${storefrontId}`)).menu
    .flatMap((group) => group.items)
    .find((menuItem) => menuItem.availabilityStatus === 'AVAILABLE');
  await fetch(api + '/cart', { method: 'DELETE', headers: { Authorization: 'Bearer ' + buyer } });
  const cart = await call(buyer, 'POST', '/cart/items', { menuItemId: item.menuItemId, quantity: 2, note: null });
  const checkout = await call(buyer, 'POST', '/orders/checkout', { cartId: cart.cartId, provider: 'ZALOPAY' }, {
    'Idempotency-Key': 'alerts-' + Date.now() + '-' + Math.random(),
  });
  await call(buyer, 'POST', `/orders/${checkout.orderId}/payment/sandbox-confirm`);
  return checkout;
}

function signIn(session) {
  window.localStorage.setItem('streetbiz-tokens', JSON.stringify(session));
  const u = session.user;
  window.localStorage.setItem('streetbiz-auth', JSON.stringify({
    state: { user: { id: String(u.userId), fullName: u.fullName, phone: u.phoneNumber, password: '', role_code: u.roleCode, account_status: u.accountStatus } },
    version: 0,
  }));
}

/**
 * Records what the app does rather than what the OS shows: system
 * notifications, chime notes, and a switch to make the tab "hidden".
 */
function instrument() {
  window.__notifications = [];
  window.__tones = 0;
  window.__hidden = false;
  window.Notification = class {
    constructor(title, options) { window.__notifications.push({ title, tag: options && options.tag }); }
    static get permission() { return 'granted'; }
    static requestPermission() { return Promise.resolve('granted'); }
  };
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden });
  const start = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (...args) {
    window.__tones += 1;
    return start.apply(this, args);
  };
}

/** Polls `probe` until it returns truthy; resolves to elapsed ms, or null on timeout. */
async function within(ms, probe) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (await probe()) return Date.now() - started;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

(async () => {
  const buyer = (await login(buyerPhone)).accessToken;
  const sellerSession = await login(sellerPhone);
  const seller = sellerSession.accessToken;
  const browser = await chromium.launch();
  const placed = [];

  // ---------------------------------------------------------------- live
  console.log('realtime');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signIn, sellerSession);
  await context.addInitScript(instrument);
  const page = await context.newPage();
  await page.goto(ui + '/vendor/orders', { waitUntil: 'networkidle' });

  const liveAfter = await within(15_000, async () => (await page.getByRole('status').innerText()).startsWith('Trực tiếp'));
  check('the board says it is live', liveAfter !== null, await page.getByRole('status').innerText());
  await page.screenshot({ path: `${output}/alerts-live-bar.png` });

  const stageCount = async (label) => {
    const text = await page.getByRole('tablist', { name: 'Đơn đang xử lý' }).getByRole('tab', { name: new RegExp(label) }).innerText();
    return Number(text.trim().split(/\s+/)[0]);
  };
  const badge = async () => {
    const text = await page.getByRole('link', { name: /Đơn hàng/ }).first().innerText();
    return Number(/\d+/.exec(text)?.[0] ?? 0);
  };

  // Away from the board, on the home screen - where a seller often is.
  await page.getByRole('link', { name: /Trang chủ/ }).first().click();
  await page.waitForURL('**/vendor/home');
  await page.mouse.click(5, 5); // the gesture that lets the page make sound
  const badgeBefore = await badge();

  const first = await placePaidOrder(buyer);
  placed.push(first.orderId);
  const toastAfter = await within(REALTIME_MS, async () => (await page.getByText(/^Đơn mới từ/).count()) > 0);
  check(`a paid order is announced on the home screen in under ${REALTIME_MS / 1000}s`, toastAfter !== null, 'no toast');
  if (toastAfter !== null) console.log(`        (${toastAfter} ms)`);
  check('the chime played (two notes)', (await page.evaluate(() => window.__tones)) >= 2, String(await page.evaluate(() => window.__tones)));
  const badgeAfter = await within(REALTIME_MS, async () => (await badge()) === badgeBefore + 1);
  check('the "Đơn hàng" badge went up by one', badgeAfter !== null, `${badgeBefore} -> ${await badge()}`);
  check('no system notification while the tab is in view', (await page.evaluate(() => window.__notifications.length)) === 0);
  await page.screenshot({ path: `${output}/alerts-home-toast.png` });

  // A hidden tab gets a system notification and a marked title.
  await page.evaluate(() => { window.__hidden = true; });
  const second = await placePaidOrder(buyer);
  placed.push(second.orderId);
  const notified = await within(REALTIME_MS, async () => (await page.evaluate(() => window.__notifications.length)) > 0);
  const notifications = await page.evaluate(() => window.__notifications);
  check('a hidden tab gets a system notification', notified !== null && notifications[0].tag === `order-${second.orderId}`, JSON.stringify(notifications));
  check('the tab title counts the unseen order', /^\(1\) /.test(await page.title()), await page.title());
  await page.evaluate(() => { window.__hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  check('the title clears when the seller comes back', !/^\(\d+\) /.test(await page.title()), await page.title());

  // Changes made elsewhere arrive without a reload.
  await page.getByRole('link', { name: /Đơn hàng/ }).first().click();
  await page.waitForURL('**/vendor/orders');
  await page.waitForTimeout(1000);
  const newBefore = await stageCount('Đơn mới');
  const acceptedBefore = await stageCount('Đã nhận');
  await call(seller, 'POST', `/vendor/orders/${second.orderId}/accept`); // "another device"
  const moved = await within(REALTIME_MS, async () =>
    (await stageCount('Đơn mới')) === newBefore - 1 && (await stageCount('Đã nhận')) === acceptedBefore + 1);
  check('an order accepted on another device moves on this board', moved !== null,
    `new ${newBefore}->${await stageCount('Đơn mới')}, accepted ${acceptedBefore}->${await stageCount('Đã nhận')}`);

  const firstTicket = page.getByRole('article', { name: `Đơn ${first.orderCode}` });
  check('setup: the first order is on the board', (await firstTicket.count()) === 1);
  await call(buyer, 'POST', `/orders/${first.orderId}/cancel`, { expectedStatus: 'PLACED' });
  const gone = await within(REALTIME_MS, async () => (await firstTicket.count()) === 0);
  check('an order the buyer cancels leaves the board', gone !== null);
  await page.screenshot({ path: `${output}/alerts-board.png` });
  await context.close();

  // ---------------------------------------------------------------- fallback
  console.log('socket blocked: polling');
  const blocked = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blocked.addInitScript(signIn, sellerSession);
  await blocked.addInitScript(instrument);
  await blocked.route('**/hubs/orders**', (route) => route.abort());
  const offline = await blocked.newPage();
  await offline.goto(ui + '/vendor/orders', { waitUntil: 'domcontentloaded' });
  await offline.waitForTimeout(3000);
  check('with no socket the board says it is polling',
    (await offline.getByRole('status').innerText()).includes('vẫn tự cập nhật'), await offline.getByRole('status').innerText());
  const third = await placePaidOrder(buyer);
  placed.push(third.orderId);
  const polled = await within(30_000, async () => (await offline.getByText(/^Đơn mới từ/).count()) > 0);
  check('polling still brings the order in within 30s', polled !== null);
  if (polled !== null) console.log(`        (${polled} ms)`);
  await blocked.close();

  await browser.close();
  console.log('\nOrders used: ' + placed.join(', ') + ' (first cancelled, second accepted, third new)');
  if (failures.length) {
    console.log(`\n${failures.length} FAILED`);
    process.exit(1);
  }
  console.log('\nALL PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
