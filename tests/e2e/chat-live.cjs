/* global require, process, console, fetch, localStorage */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check for buyer/seller chat: composer layout, paging, the
// unread badge, sending, and realtime delivery. Writes messages, so point it at
// a disposable database only.
//
//   E2E_ALLOW_DB_MUTATION=1 \
//   PLAYWRIGHT_MODULE_PATH=<path to playwright> \
//   E2E_CONVERSATION_ID=<id of a thread the buyer owns> \
//   E2E_ARTIFACTS=<screenshot folder> \
//   node tests/e2e/chat-live.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const api = process.env.E2E_API_URL || 'http://localhost:5023/api';
const ui = process.env.E2E_UI_URL || 'http://localhost:5173';
const output = process.env.E2E_ARTIFACTS;
const conversation = process.env.E2E_CONVERSATION_ID;
const password = process.env.E2E_PASSWORD || 'Password123!';
const buyerPhone = process.env.E2E_CUSTOMER_PHONE || '0905000201';
const sellerPhone = process.env.E2E_VENDOR_PHONE || '0905000101';

assert.equal(
  process.env.E2E_ALLOW_DB_MUTATION,
  '1',
  'Set E2E_ALLOW_DB_MUTATION=1 for a disposable database.',
);
assert.ok(conversation, 'Missing E2E_CONVERSATION_ID');
assert.ok(output, 'Missing E2E_ARTIFACTS');
require('node:fs').mkdirSync(output, { recursive: true });

async function login(phoneNumber) {
  const response = await fetch(api + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, password }),
  });
  // Read the body once: consuming it inside the assert message would leave
  // nothing for the parse below.
  const body = await response.text();
  assert.ok(response.ok, 'login ' + phoneNumber + ' failed: ' + body);
  return JSON.parse(body);
}

const failures = [];
function check(name, condition, detail) {
  console.log((condition ? '  PASS  ' : '  FAIL  ') + name + (condition || !detail ? '' : ' -- ' + detail));
  if (!condition) failures.push(name);
}

(async () => {
  const browser = await chromium.launch();
  const pageErrors = [];

  async function open(auth, viewport) {
    const context = await browser.newContext({ viewport, timezoneId: 'Asia/Ho_Chi_Minh' });
    await context.addInitScript((session) => {
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
    }, auth);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push('console: ' + message.text());
    });
    return { context, page };
  }

  const buyer = await login(buyerPhone);
  const seller = await login(sellerPhone);
  const threadUrl = `${ui}/customer/chat/${conversation}`;
  const inputSelector = 'input[aria-label="Nội dung tin nhắn"]';

  console.log('desktop 1280x800 (buyer)');
  let { context, page } = await open(buyer, { width: 1280, height: 800 });
  await page.goto(threadUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector(inputSelector);
  await page.screenshot({ path: output + '/chat-thread-desktop.png' });

  // The composer regression: StickyActions used to size the input like a button.
  const input = await page.locator(inputSelector).boundingBox();
  const sendButton = await page.getByRole('button', { name: 'Gửi' }).boundingBox();
  check('input is wider than the send button', input.width > sendButton.width,
    `input=${Math.round(input.width)} button=${Math.round(sendButton.width)}`);
  check('input and button share a row', Math.abs(input.y - sendButton.y) < 12);
  check('input is one row tall', input.height >= 40 && input.height <= 56, `h=${Math.round(input.height)}`);

  const older = page.getByRole('button', { name: 'Xem tin nhắn cũ hơn' });
  if (await older.isVisible()) {
    const before = await page.locator('.rounded-2xl').count();
    await older.click();
    await page.waitForTimeout(1500);
    check('older page is prepended', (await page.locator('.rounded-2xl').count()) > before);
  } else {
    console.log('  SKIP  older messages (thread shorter than one page)');
  }

  const typed = 'Kiểm thử tự động ' + Date.now();
  await page.fill(inputSelector, typed);
  await page.getByRole('button', { name: 'Gửi' }).click();
  await page.waitForTimeout(2000);
  check('sent message appears', (await page.locator(`text=${typed}`).count()) > 0);
  check('composer clears after a successful send', (await page.inputValue(inputSelector)) === '');
  await context.close();

  console.log('desktop 1280x800 (seller) - unread badge');
  ({ context, page } = await open(seller, { width: 1280, height: 800 }));
  await page.goto(`${ui}/vendor/home`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const navText = (await page.locator('a[href="/vendor/chat"]').innerText()).replace(/\s+/g, ' ');
  check('chat tab shows an unread count', /\d/.test(navText), `tab = "${navText.trim()}"`);
  await page.screenshot({ path: output + '/chat-badge-vendor.png' });
  await context.close();

  console.log('phone 390x844 (buyer)');
  ({ context, page } = await open(buyer, { width: 390, height: 844 }));
  await page.goto(threadUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector(inputSelector);
  await page.waitForTimeout(800);
  const phoneInput = await page.locator(inputSelector).boundingBox();
  const phoneButton = await page.getByRole('button', { name: 'Gửi' }).boundingBox();
  check('phone: input is wider than the button', phoneInput.width > phoneButton.width);
  check('phone: composer stays inside the viewport',
    phoneInput.x >= 0 && phoneButton.x + phoneButton.width <= 390);
  await page.screenshot({ path: output + '/chat-thread-phone.png' });
  await context.close();

  console.log('realtime (no reload)');
  ({ context, page } = await open(buyer, { width: 1280, height: 800 }));
  await page.goto(threadUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector(inputSelector);
  await page.waitForTimeout(3000); // let the hub finish its handshake
  const pushed = 'Realtime ' + Date.now();
  await fetch(`${api}/chat/conversations/${conversation}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + seller.accessToken },
    body: JSON.stringify({ body: pushed }),
  });
  let delivered = false;
  for (let i = 0; i < 10 && !delivered; i += 1) {
    await page.waitForTimeout(700);
    delivered = (await page.locator(`text=${pushed}`).count()) > 0;
  }
  check('hub delivers a message without a reload', delivered);
  await context.close();

  await browser.close();

  const realErrors = pageErrors.filter(
    (error) =>
      !/favicon|ResizeObserver/i.test(error) &&
      // Expected on teardown: React unmounts while the hub is still negotiating.
      !/stopped during negotiation/i.test(error),
  );
  check('no javascript errors on the page', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  console.log(failures.length ? '\nFAILED: ' + failures.join(', ') : '\nALL CHECKS PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
