/* global require, process, console, fetch, window, document, OscillatorNode, setTimeout */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check that chat messages announce themselves, both ways:
//   - a buyer's message reaches the seller in seconds on any screen, with a
//     toast and the "Tin nhắn" badge - and a system notification when the tab
//     is hidden. No sound: that is for new orders;
//   - the thread being read updates in place and is not announced on top;
//   - the seller's reply is announced to the buyer the same way;
//   - with the socket blocked, polling still brings the message in.
//
// Sends real chat messages, so point it at a disposable database.
//
//   E2E_ALLOW_DB_MUTATION=1 PLAYWRIGHT_MODULE_PATH=<path> E2E_ARTIFACTS=<dir> \
//   node tests/e2e/chat-alerts-live.cjs
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

async function call(token, method, route, body) {
  const response = await fetch(api + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  assert.ok(response.ok, `${method} ${route} -> ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const login = (phoneNumber) => call(null, 'POST', '/auth/login', { phoneNumber, password });

function signIn(session) {
  window.localStorage.setItem('streetbiz-tokens', JSON.stringify(session));
  const u = session.user;
  window.localStorage.setItem('streetbiz-auth', JSON.stringify({
    state: { user: { id: String(u.userId), fullName: u.fullName, phone: u.phoneNumber, password: '', role_code: u.roleCode, account_status: u.accountStatus } },
    version: 0,
  }));
}

/** Records system notifications and chime notes; `window.__hidden` hides the tab. */
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

async function within(ms, probe) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (await probe()) return Date.now() - started;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

async function openAs(browser, session, path, { blockSocket = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signIn, session);
  await context.addInitScript(instrument);
  if (blockSocket) await context.route('**/hubs/chat**', (route) => route.abort());
  const page = await context.newPage();
  await page.goto(ui + path, { waitUntil: 'domcontentloaded' });
  return { context, page };
}

const toasts = (page) => page.getByText(/^Tin nhắn mới từ/).count();

(async () => {
  const buyerSession = await login(buyerPhone);
  const sellerSession = await login(sellerPhone);
  const buyer = buyerSession.accessToken;
  const seller = sellerSession.accessToken;
  const thread = await call(buyer, 'POST', '/chat/conversations', { storefrontId });
  const id = thread.conversationId;
  const stamp = () => new Date().toISOString().slice(11, 19);
  const send = (token, body) => call(token, 'POST', `/chat/conversations/${id}/messages`, { body });
  console.log('thread ' + id);
  const browser = await chromium.launch();

  // ---------------------------------------------------------------- seller
  console.log('seller, away from the inbox');
  // Start from a read thread, before the page loads its unread count.
  await call(seller, 'GET', `/chat/conversations/${id}`);
  const { context, page } = await openAs(browser, sellerSession, '/vendor/chat');
  await page.waitForTimeout(4000); // let the socket connect and the baseline load
  await page.screenshot({ path: `${output}/chat-inbox.png` });

  await page.getByRole('link', { name: /Trang chủ/ }).first().click();
  await page.waitForURL('**/vendor/home');
  await page.mouse.click(5, 5); // the gesture that lets the page make sound
  const badge = async () => Number(/\d+/.exec(await page.getByRole('link', { name: /Tin nhắn/ }).first().innerText())?.[0] ?? 0);
  const badgeBefore = await badge();

  await send(buyer, `Còn bánh mì không quán? (${stamp()})`);
  const announced = await within(REALTIME_MS, async () => (await toasts(page)) > 0);
  check(`a buyer's message is announced on the seller's home screen in under ${REALTIME_MS / 1000}s`, announced !== null);
  if (announced !== null) console.log(`        (${announced} ms)`);
  check('and makes no sound', (await page.evaluate(() => window.__tones)) === 0);
  const unread = (await call(seller, 'GET', '/chat/unread-count')).unreadCount;
  check('the "Tin nhắn" badge went up to the server unread count',
    (await within(REALTIME_MS, async () => (await badge()) === unread && unread > badgeBefore)) !== null,
    `${badgeBefore} -> ${await badge()} (server ${unread})`);
  await page.screenshot({ path: `${output}/chat-home-toast.png` });

  await page.evaluate(() => { window.__hidden = true; });
  await send(buyer, `Cho em 2 ổ nhé (${stamp()})`);
  const notified = await within(REALTIME_MS, async () => (await page.evaluate(() => window.__notifications.length)) > 0);
  const notifications = await page.evaluate(() => window.__notifications);
  check('a hidden tab gets a system notification for the thread', notified !== null && notifications[0].tag === `chat-${id}`,
    JSON.stringify(notifications));
  await page.evaluate(() => { window.__hidden = false; });

  // Reading the thread: the message lands in place, with no alert on top.
  await page.goto(`${ui}/vendor/chat/${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const before = await toasts(page);
  const text = `Quán làm luôn giúp em (${stamp()})`;
  await send(buyer, text);
  const landed = await within(REALTIME_MS, async () => (await page.getByText(text).count()) > 0);
  check('the open thread shows the message without a reload', landed !== null);
  await page.waitForTimeout(1500);
  check('and does not announce it on top', (await toasts(page)) === before);
  await context.close();

  // ---------------------------------------------------------------- buyer
  console.log('buyer, hearing back');
  const buyerView = await openAs(browser, buyerSession, '/customer/orders');
  await buyerView.page.waitForTimeout(4000); // let the socket connect and the baseline load
  await send(seller, `Dạ còn ạ, 5 phút nữa có (${stamp()})`);
  const replied = await within(REALTIME_MS, async () => (await toasts(buyerView.page)) > 0);
  check('the seller\'s reply is announced to the buyer', replied !== null,
    await buyerView.page.locator('body').innerText().then((t) => t.slice(0, 200)));
  await buyerView.page.screenshot({ path: `${output}/chat-buyer-toast.png` });
  await buyerView.context.close();

  // ---------------------------------------------------------------- fallback
  console.log('socket blocked: polling');
  const offline = await openAs(browser, sellerSession, '/vendor/chat', { blockSocket: true });
  await offline.page.waitForTimeout(3000);
  await send(buyer, `Quán ơi? (${stamp()})`);
  const polled = await within(30_000, async () => (await toasts(offline.page)) > 0);
  check('polling still announces the message within 30s', polled !== null);
  if (polled !== null) console.log(`        (${polled} ms)`);
  await offline.context.close();

  await browser.close();
  if (failures.length) {
    console.log(`\n${failures.length} FAILED`);
    process.exit(1);
  }
  console.log('\nALL PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
