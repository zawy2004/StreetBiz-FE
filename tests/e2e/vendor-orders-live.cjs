/* global require, process, console, fetch, document, window, getComputedStyle */
/* The globals below appear inside addInitScript bodies, which run in the page. */
/* global localStorage */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check for the seller's order board (/vendor/orders): the stage
// counts, a ticket moving along when it is accepted, the closed tab filtered on
// the server, and paging - at desktop width and at phone width.
//
// Places one paid order and accepts it, so point it at a disposable database.
//
//   E2E_ALLOW_DB_MUTATION=1 \
//   PLAYWRIGHT_MODULE_PATH=<path to playwright> \
//   E2E_ARTIFACTS=<screenshot folder> \
//   node tests/e2e/vendor-orders-live.cjs
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
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  assert.ok(response.ok, `${method} ${route} -> ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const login = (phoneNumber) => call(null, 'POST', '/auth/login', { phoneNumber, password });

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

/** A paid order with two lines and a note, left as a new order. */
async function placeOrder(buyer) {
  const menu = (await call(buyer, 'GET', `/marketplace/storefronts/${storefrontId}`)).menu
    .flatMap((group) => group.items)
    .filter((item) => item.availabilityStatus === 'AVAILABLE');
  assert.ok(menu.length >= 2, 'storefront needs two available items');
  await fetch(api + '/cart', { method: 'DELETE', headers: { Authorization: 'Bearer ' + buyer } });
  await call(buyer, 'POST', '/cart/items', { menuItemId: menu[0].menuItemId, quantity: 2, note: 'Ít cay (E2E)' });
  const cart = await call(buyer, 'POST', '/cart/items', { menuItemId: menu[1].menuItemId, quantity: 1, note: null });
  const checkout = await call(buyer, 'POST', '/orders/checkout', { cartId: cart.cartId, provider: 'ZALOPAY' }, {
    'Idempotency-Key': 'board-' + Date.now(),
  });
  await call(buyer, 'POST', `/orders/${checkout.orderId}/payment/sandbox-confirm`);
  return checkout;
}

(async () => {
  const buyer = (await login(buyerPhone)).accessToken;
  const sellerSession = await login(sellerPhone);
  const seller = sellerSession.accessToken;
  const total = async (status) =>
    (await call(seller, 'GET', `/vendor/orders?status=${status}&page=1&pageSize=10`)).totalItems;

  const placed = await placeOrder(buyer);
  console.log('order placed: ' + placed.orderId);
  const browser = await chromium.launch();

  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['phone', { width: 360, height: 780 }],
  ]) {
    console.log(name);
    const context = await browser.newContext({ viewport });
    await context.addInitScript(signIn, sellerSession);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    await page.goto(ui + '/vendor/orders', { waitUntil: 'networkidle' });

    const stages = page.getByRole('tablist', { name: 'Đơn đang xử lý' });
    const counts = async () =>
      Object.fromEntries(
        (await stages.getByRole('tab').allInnerTexts()).map((text) => {
          const [count, ...label] = text.trim().split(/\s+/);
          return [label.join(' '), Number(count)];
        }),
      );
    const expected = {
      'Đơn mới': await total('PLACED'),
      'Đã nhận': await total('ACCEPTED'),
      'Đang làm': await total('PREPARING'),
      'Chờ lấy': await total('READY_FOR_PICKUP'),
    };
    await page.waitForFunction(
      (want) => document.querySelectorAll('[role="tablist"] [role="tab"]').length >= 4 && want > 0,
      expected['Đơn mới'],
    );
    await page.waitForTimeout(500);
    const shown = await counts();
    check('each stage shows the API\'s count', JSON.stringify(shown) === JSON.stringify(expected), JSON.stringify({ shown, expected }));

    // The order this run placed. The desktop pass accepts it, so by the phone
    // pass it waits one stage along.
    const ticket = page.getByRole('article', { name: `Đơn ${placed.orderCode}` });
    const stage = name === 'desktop' ? 'Đơn mới' : 'Đã nhận';
    if (stage !== 'Đơn mới') {
      await stages.getByRole('tab', { name: new RegExp(stage) }).click();
      await ticket.waitFor({ timeout: 8000 }).catch(() => {});
    }
    check(`the order is a ticket on the "${stage}" stage`, (await ticket.count()) === 1);
    check('the ticket reads quantity before name, with the buyer\'s note',
      (await ticket.getByText('2×').count()) === 1 && (await ticket.getByText('Ghi chú: Ít cay (E2E)').count()) === 1);
    const spill = await page.evaluate(() =>
      [...document.querySelectorAll('article')].some((card) => {
        const edge = card.getBoundingClientRect().right;
        return [...card.querySelectorAll('*')].some((el) => el.getBoundingClientRect().right > edge + 1);
      }),
    );
    check('nothing spills past a ticket\'s edge', !spill);
    const clipped = await stages.getByRole('tab').evaluateAll((tabs) =>
      tabs
        .map((tab) => tab.lastElementChild)
        .filter((label) => label && label.scrollWidth > label.clientWidth)
        .map((label) => label.textContent),
    );
    check('no stage name is cut short', clipped.length === 0, JSON.stringify(clipped));
    check('no sideways page scroll', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: `${output}/board-${name}-new.png` });

    if (name === 'desktop') {
      // Accepting moves the ticket one stage along, and both counts follow.
      await ticket.getByRole('button', { name: 'Nhận đơn' }).click();
      let toast = true;
      await page.getByText('Đã nhận đơn. Đơn chuyển sang "Đã nhận".').waitFor({ timeout: 8000 }).catch(() => { toast = false; });
      check('accepting says where the order went', toast);
      await page.waitForTimeout(1500);
      const after = await counts();
      check('new orders went down by one and accepted up by one',
        after['Đơn mới'] === shown['Đơn mới'] - 1 && after['Đã nhận'] === shown['Đã nhận'] + 1,
        JSON.stringify({ before: shown, after }));
      check('the ticket left the new-orders stage', (await ticket.count()) === 0);
      await stages.getByRole('tab', { name: /Đã nhận/ }).click();
      await page.waitForTimeout(1200);
      check('it sits on the accepted stage, offering the next step',
        (await ticket.getByRole('button', { name: 'Bắt đầu chuẩn bị' }).count()) === 1);
    }

    // Closed orders: two statuses, one server-side filter.
    const closedTotal = await total('REJECTED,CANCELLED');
    const answered = page.waitForResponse((r) => decodeURIComponent(r.url()).includes('status=REJECTED,CANCELLED'));
    await page.getByRole('tab', { name: 'Từ chối / hủy' }).click();
    await answered;
    await page.waitForTimeout(500);
    const chips = await page.locator('article').allInnerTexts();
    check(`closed tab lists ${Math.min(closedTotal, 10)} closed tickets and nothing else`,
      chips.length === Math.min(closedTotal, 10) && chips.every((text) => /ĐÃ HUỶ|TỪ CHỐI/.test(text)),
      `${chips.length} tickets`);

    // Paging, on whichever history tab is long enough.
    const doneTotal = await total('COMPLETED');
    if (doneTotal > 10) {
      const loaded = page.waitForResponse((r) => r.url().includes('status=COMPLETED'));
      await page.getByRole('tab', { name: 'Hoàn thành' }).click();
      await loaded;
      await page.waitForTimeout(500);
      const pager = page.getByRole('navigation', { name: 'Phân trang' });
      check('the pager counts this tab\'s orders', (await pager.innerText()).includes(`trên ${doneTotal}`), await pager.innerText());
      const next = await page.getByRole('button', { name: 'Trang sau' }).boundingBox();
      check('"Sau" is fully on screen', Boolean(next) && next.x + next.width <= viewport.width, JSON.stringify(next));
      const first = await page.locator('article').first().getAttribute('aria-label');
      await page.getByRole('button', { name: 'Trang sau' }).click();
      await page.waitForResponse((r) => r.url().includes('status=COMPLETED') && r.url().includes('page=2'));
      await page.waitForTimeout(800);
      check('page two shows other orders', (await page.locator('article').first().getAttribute('aria-label')) !== first);
      const scrolled = await page.evaluate(() => {
        const column = [...document.querySelectorAll('*')].find(
          (node) => getComputedStyle(node).overflowY === 'auto' && node.scrollHeight > node.clientHeight,
        );
        return column ? column.scrollTop : 0;
      });
      check('page two starts at the top', scrolled === 0, String(scrolled));
      await page.screenshot({ path: `${output}/board-${name}-history.png` });
    } else {
      console.log('  SKIP  paging -- only ' + doneTotal + ' completed orders');
    }

    check('no errors in the page', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  await browser.close();
  console.log('\nLeaves behind order ' + placed.orderId + ' (accepted).');
  if (failures.length) {
    console.log(`\n${failures.length} FAILED`);
    process.exit(1);
  }
  console.log('\nALL PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
