/* global require, process, console, fetch, window, Buffer */
/* The globals below appear inside addInitScript bodies, which run in the page. */
/* global localStorage, document, navigator, Image, setInterval */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check for what ORD-06 tells people when a handover does NOT
// go through: every refusal a seller or buyer can hit, read off the screen they
// would read it on. pickup-live.cjs covers the three routes succeeding.
//
// Creates and completes its own orders, so point it at a disposable database.
//
//   E2E_ALLOW_DB_MUTATION=1 \
//   PLAYWRIGHT_MODULE_PATH=<path to playwright> \
//   E2E_ARTIFACTS=<screenshot folder> \
//   node tests/e2e/pickup-messages-live.cjs
//
// Its last step spends the seller's pickup rate limit on purpose, so wait a
// minute before running pickup-live.cjs with the same seller.
//
// Leaves behind, all SB-%: one COMPLETED order, one left PREPARING, one REJECTED,
// and one at another vendor's storefront (cancelled if the API allows it).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QRCodeSVG } = require('qrcode.react');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const api = process.env.E2E_API_URL || 'http://localhost:5023/api';
const ui = process.env.E2E_UI_URL || 'http://localhost:5173';
const output = process.env.E2E_ARTIFACTS;
const password = process.env.E2E_PASSWORD || 'Password123!';
const buyerPhone = process.env.E2E_CUSTOMER_PHONE || '0905000201';
const sellerPhone = process.env.E2E_VENDOR_PHONE || '0905000101';
const sellerStorefrontId = Number(process.env.E2E_STOREFRONT_ID || 1);

assert.equal(process.env.E2E_ALLOW_DB_MUTATION, '1', 'Set E2E_ALLOW_DB_MUTATION=1 for a disposable database.');
assert.ok(output, 'Missing E2E_ARTIFACTS');
fs.mkdirSync(output, { recursive: true });

// The exact sentences the backend owns (OrderPickupMessages). Copied rather
// than imported: a drift between them and what the screen shows is the bug.
const MSG = {
  notStreetBiz: 'Mã này không phải mã nhận hàng của StreetBiz.',
  notYourOrder: 'Đơn này không thuộc gian hàng của bạn.',
  malformed: 'Mã nhận hàng gồm 8 ký tự. Kiểm tra lại mã vừa nhập.',
  noMatch: 'Không có đơn nào đang chờ giao khớp mã này. Kiểm tra lại mã khách đọc; đơn đã giao hoặc đã huỷ thì mã không dùng được nữa.',
  handedOver: 'Đơn này đã giao cho khách rồi.',
  closed: 'Đơn này đã bị huỷ hoặc từ chối, không thể giao.',
  placed: 'Đơn chưa được nhận. Hãy bấm "Nhận đơn" trước khi giao.',
  accepted: 'Đơn chưa chuẩn bị xong. Hãy bấm "Bắt đầu chuẩn bị" rồi "Sẵn sàng lấy món".',
  preparing: 'Đơn đang chuẩn bị. Hãy bấm "Sẵn sàng lấy món" trước khi giao cho khách.',
  reasonRequired: 'Phải ghi lý do khi giao đơn mà không có mã.',
  reasonShort: 'Lý do quá ngắn. Hãy ghi rõ vì sao không đọc được mã của khách.',
  reasonLong: 'Lý do dài tối đa 500 ký tự.',
  tooMany: 'Bạn đã thử quá nhiều lần. Vui lòng chờ ít phút rồi thử lại.',
  insecure: 'Trình duyệt chỉ cho mở camera trên trang HTTPS hoặc localhost.',
};

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
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: response.status, body: parsed };
}

/** The sentence a screen would show for a failed call: detail, else the first field error. */
const shown = (body) =>
  (body && (body.detail || Object.values(body.errors || {})[0]?.[0])) || JSON.stringify(body);

const login = async (phoneNumber) => {
  const { status, body } = await call(null, 'POST', '/auth/login', { phoneNumber, password });
  assert.equal(status, 200, 'login ' + phoneNumber + ': ' + JSON.stringify(body));
  return body;
};

/** A paid order at a storefront, left in PLACED. */
async function placePaidOrder(buyer, storefrontId) {
  const detail = await call(buyer, 'GET', `/marketplace/storefronts/${storefrontId}`);
  assert.equal(detail.status, 200, 'storefront ' + storefrontId);
  const item = (detail.body.menu || []).flatMap((group) => group.items || [])
    .find((menuItem) => menuItem.availabilityStatus === 'AVAILABLE');
  if (!item) return null;
  await call(buyer, 'DELETE', '/cart');
  const cart = await call(buyer, 'POST', '/cart/items', { menuItemId: item.menuItemId, quantity: 1, note: null });
  assert.equal(cart.status, 200, 'add to cart: ' + JSON.stringify(cart.body));
  const checkout = await call(buyer, 'POST', '/orders/checkout',
    { cartId: cart.body.cartId, provider: 'ZALOPAY' },
    { 'Idempotency-Key': 'pickup-msg-' + Date.now() + '-' + Math.random() });
  assert.equal(checkout.status, 200, 'checkout: ' + JSON.stringify(checkout.body));
  const paid = await call(buyer, 'POST', `/orders/${checkout.body.orderId}/payment/sandbox-confirm`);
  assert.equal(paid.status, 200, 'sandbox pay: ' + JSON.stringify(paid.body));
  return checkout.body.orderId;
}

/** The same QR component the app draws, as an image the fake camera can hold up. */
const qrDataUrl = (value) => {
  const svg = renderToStaticMarkup(React.createElement(QRCodeSVG, { value, size: 200, fgColor: '#1D2939', bgColor: '#FFFFFF' }))
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};

function signIn(session) {
  localStorage.setItem('streetbiz-tokens', JSON.stringify(session));
  const u = session.user;
  localStorage.setItem('streetbiz-auth', JSON.stringify({
    state: { user: { id: String(u.userId), fullName: u.fullName, phone: u.phoneNumber, password: '', role_code: u.roleCode, account_status: u.accountStatus } },
    version: 0,
  }));
}

/**
 * A canvas stands in for the lens. `window.__showToCamera(dataUrl | null)`
 * holds a code up or takes it away; everything downstream - the video element,
 * the frame grab and jsQR - is the application's own code.
 */
function fakeCamera() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let image = null;
  window.__showToCamera = (dataUrl) => {
    if (!dataUrl) { image = null; return; }
    const next = new Image();
    next.onload = () => { image = next; };
    next.src = dataUrl;
  };
  setInterval(() => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (image) ctx.drawImage(image, 170, 90, 300, 300);
  }, 100);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => canvas.captureStream(10) },
  });
}

(async () => {
  const buyerSession = await login(buyerPhone);
  const sellerSession = await login(sellerPhone);
  const buyer = buyerSession.accessToken;
  const seller = sellerSession.accessToken;
  const browser = await chromium.launch();

  // ---------------------------------------------------------------- buyer
  console.log('buyer - asking for a code');
  const orderId = await placePaidOrder(buyer, sellerStorefrontId);
  assert.ok(orderId, 'storefront ' + sellerStorefrontId + ' has nothing available to order');
  const code = await call(buyer, 'GET', `/orders/${orderId}/pickup-code`);
  check('a paid PLACED order already has a code to show', code.status === 200, JSON.stringify(code.body));
  const { shortCode } = code.body;

  const buyerContext = await browser.newContext({ viewport: { width: 430, height: 900 } });
  await buyerContext.addInitScript(signIn, buyerSession);
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`${ui}/customer/orders/${orderId}`, { waitUntil: 'networkidle' });
  await buyerPage.waitForSelector('[data-testid="qr-code"]');
  check('the buyer sees the QR and the code to read out while the order is PLACED',
    (await buyerPage.locator(`text=${shortCode}`).count()) > 0);
  await buyerPage.screenshot({ path: output + '/msg-buyer-placed.png', fullPage: true });
  await buyerPage.locator('[data-testid="qr-code"]').screenshot({ path: output + '/msg-buyer-qr.png' });
  const buyerQr = 'data:image/png;base64,' + fs.readFileSync(output + '/msg-buyer-qr.png').toString('base64');

  // ---------------------------------------------------------------- camera
  console.log('seller - the camera, one refusal after another');
  const camContext = await browser.newContext({ viewport: { width: 430, height: 900 } });
  await camContext.addInitScript(signIn, sellerSession);
  await camContext.addInitScript(fakeCamera);
  const cam = await camContext.newPage();
  await cam.goto(`${ui}/vendor/orders/scan`, { waitUntil: 'networkidle' });
  await cam.waitForSelector('video');

  const show = (dataUrl) => cam.evaluate((d) => window.__showToCamera(d), dataUrl);
  /** Waits for a sentence to be on the scan screen; screenshots it either way. */
  const expectOnScreen = async (label, text, shot) => {
    let seen = false;
    let why = '';
    try {
      const target = cam.getByText(text, { exact: false }).first();
      await target.waitFor({ timeout: 8000 });
      // Present in the DOM is not enough: a refusal below the fold looks, to a
      // seller watching the camera, exactly like the scan doing nothing.
      seen = await target.evaluate((el) => new Promise((resolve) => {
        const observer = new window.IntersectionObserver(([entry]) => {
          observer.disconnect();
          resolve(entry.isIntersecting);
        });
        observer.observe(el);
      }));
      if (!seen) why = 'on the page but off-screen; ';
    } catch { /* reported below */ }
    await cam.screenshot({ path: `${output}/${shot}.png`, fullPage: true });
    const errors = await cam.locator('.text-error').allInnerTexts();
    check(label, seen, why + 'screen shows: ' + JSON.stringify(errors));
  };
  /** Takes the code away long enough for the scanner to count the next showing as new. */
  const takeAway = async () => { await show(null); await cam.waitForTimeout(1600); };

  // Something that is not ours at all: a bank transfer QR, longer than any token.
  const bankQr = '00020101021238570010A000000727012700069704220113VQRQABCDEFGH0208QRIBFTTA53037045802VN62150811DH-2026-00016304'
    + '9A3F0002010102123857001000000727012700069704220113VQRQABCDEFGH0208QRIBFTTA53037045802VN621508';
  await show(qrDataUrl(bankQr));
  await expectOnScreen('a bank transfer QR is "not a StreetBiz code", not a validator sentence', MSG.notStreetBiz, 'msg-cam-bank-qr');
  await takeAway();
  await show(qrDataUrl('https://example.com/menu'));
  await expectOnScreen('a short foreign QR gets the same sentence', MSG.notStreetBiz, 'msg-cam-url-qr');
  await takeAway();

  // The buyer's real code, walked through every status on the way to ready.
  await show(buyerQr);
  await expectOnScreen('PLACED: names the "Nhận đơn" button', MSG.placed, 'msg-cam-placed');

  assert.equal((await call(seller, 'POST', `/vendor/orders/${orderId}/accept`)).status, 200);
  // Same phone taken away and held up again - the scanner must read it again.
  await takeAway();
  await show(buyerQr);
  await expectOnScreen('ACCEPTED, same code shown again: names "Bắt đầu chuẩn bị" then "Sẵn sàng lấy món"', MSG.accepted, 'msg-cam-accepted');

  assert.equal((await call(seller, 'POST', `/vendor/orders/${orderId}/preparing`)).status, 200);
  // This time the code never leaves the frame: "Thử lại" must read it again.
  await cam.getByRole('button', { name: 'Thử lại' }).click();
  await expectOnScreen('PREPARING, via "Thử lại" with the code still held up: names "Sẵn sàng lấy món"', MSG.preparing, 'msg-cam-preparing');

  // The label the message names is a button that really exists on the order.
  const detailContext = await browser.newContext({ viewport: { width: 430, height: 900 } });
  await detailContext.addInitScript(signIn, sellerSession);
  const detail = await detailContext.newPage();
  await detail.goto(`${ui}/vendor/orders/${orderId}`, { waitUntil: 'networkidle' });
  check('the order screen really has a "Sẵn sàng lấy món" button to press',
    (await detail.getByRole('button', { name: 'Sẵn sàng lấy món' }).count()) === 1);
  check('the no-code handover is not offered before the order is ready',
    (await detail.getByRole('button', { name: 'Khách không có mã' }).count()) === 0);
  await detail.getByRole('button', { name: 'Sẵn sàng lấy món' }).click();
  await detail.getByRole('button', { name: 'Khách không có mã' }).waitFor({ timeout: 8000 });
  await detailContext.close();

  const typed = cam.getByLabel('Mã nhận hàng');
  const typeCode = async (value) => {
    await typed.fill(value);
    await cam.getByRole('button', { name: 'Xác nhận giao đơn' }).click();
  };

  await cam.getByRole('button', { name: 'Thử lại' }).click();
  await expectOnScreen('READY: the scan hands the order over', 'Đã giao đơn cho khách', 'msg-cam-done');
  await cam.getByRole('button', { name: 'Quét đơn tiếp theo' }).click();
  await expectOnScreen('the same code scanned again says it was already handed over', MSG.handedOver, 'msg-cam-again');
  await show(null);

  // ---------------------------------------------------------------- typed
  console.log('seller - typing the code');
  await typeCode('ABC');
  await expectOnScreen('three letters: says a code is 8 characters', MSG.malformed, 'msg-typed-short');
  await typeCode(shortCode);
  await expectOnScreen('the code of a completed order: no longer usable, not "misheard"', MSG.noMatch, 'msg-typed-completed');

  // A second order, still being prepared, typed before "ready" was pressed.
  const early = await placePaidOrder(buyer, sellerStorefrontId);
  const earlyCode = (await call(buyer, 'GET', `/orders/${early}/pickup-code`)).body;
  assert.equal((await call(seller, 'POST', `/vendor/orders/${early}/accept`)).status, 200);
  assert.equal((await call(seller, 'POST', `/vendor/orders/${early}/preparing`)).status, 200);
  await typeCode(earlyCode.shortCode.toLowerCase().replace(/(.{4})/, '$1-'));
  await expectOnScreen('typed code of a PREPARING order (lower case, dashed): names "Sẵn sàng lấy món"', MSG.preparing, 'msg-typed-preparing');

  // ---------------------------------------------------------------- manual
  console.log('seller - handing over with no code');
  const manual = async (id, reason) => call(seller, 'POST', `/vendor/orders/${id}/handover-without-code`, { reason });
  let result = await manual(early, 'Khách quên điện thoại ở nhà');
  check('a written reason still cannot hand over an unready order', shown(result.body) === MSG.preparing, shown(result.body));
  result = await manual(early, '');
  check('no reason: says a reason is required', shown(result.body) === MSG.reasonRequired, shown(result.body));
  result = await manual(early, ' ab ');
  check('a two-letter reason: says it is too short', shown(result.body) === MSG.reasonShort, shown(result.body));
  result = await manual(early, 'x'.repeat(501));
  check('a 501-character reason: says the limit, in Vietnamese', shown(result.body) === MSG.reasonLong, shown(result.body));

  // A closed order: only a PLACED order can be rejected, so a fresh one.
  const closed = await placePaidOrder(buyer, sellerStorefrontId);
  const closedCode = (await call(buyer, 'GET', `/orders/${closed}/pickup-code`)).body;
  const rejected = await call(seller, 'POST', `/vendor/orders/${closed}/reject`, { reason: 'Hết nguyên liệu (E2E)' });
  check('setup: the seller can reject a PLACED order', rejected.status === 200, JSON.stringify(rejected.body));
  // The last refusal came from the code field, so there is no camera "Thử lại"
  // on screen; the camera re-armed by itself when the old code left the frame.
  await show(qrDataUrl(closedCode.token));
  await expectOnScreen('the code of a rejected order: cannot be handed over', MSG.closed, 'msg-cam-rejected');
  await takeAway();

  // Buyer side of the same states.
  const buyerCodeFor = async (id) => shown((await call(buyer, 'GET', `/orders/${id}/pickup-code`)).body);
  check('buyer, completed order: the code is gone because it was handed over', (await buyerCodeFor(orderId)) === MSG.handedOver, await buyerCodeFor(orderId));
  check('buyer, rejected order: the code is gone because the order closed', (await buyerCodeFor(closed)) === MSG.closed, await buyerCodeFor(closed));
  await buyerPage.reload({ waitUntil: 'networkidle' });
  check('buyer screen hides the QR once the order is completed',
    (await buyerPage.locator('[data-testid="qr-code"]').count()) === 0);
  await buyerPage.screenshot({ path: output + '/msg-buyer-completed.png', fullPage: true });

  // ---------------------------------------------------------------- other stall
  console.log('seller - another stall\'s code');
  const list = await call(buyer, 'GET', '/marketplace/storefronts');
  const storefronts = Array.isArray(list.body) ? list.body : (list.body.items || list.body.data || []);
  // Chosen before ordering anything: an order at the seller's own second
  // stall would be theirs, and would be left behind for nothing.
  const ownVendorId = storefronts.find((s) => s.storefrontId === sellerStorefrontId)?.vendorId;
  let foreign = null;
  for (const storefront of storefronts.filter((s) => s.vendorId !== ownVendorId)) {
    foreign = await placePaidOrder(buyer, storefront.storefrontId).catch(() => null);
    if (foreign) break;
  }
  if (foreign) {
    const foreignCode = (await call(buyer, 'GET', `/orders/${foreign}/pickup-code`)).body;
    await show(qrDataUrl(foreignCode.token));
    await expectOnScreen('another stall\'s code: not your order', MSG.notYourOrder, 'msg-cam-foreign');
    await show(null);
    await call(buyer, 'POST', `/orders/${foreign}/cancel`);
  } else {
    // Not a failure of the app: this database has one vendor. The refusal is
    // covered by the Application tests instead.
    console.log('  SKIP  another stall\'s code -- every public storefront belongs to vendor ' + ownVendorId);
  }

  // ---------------------------------------------------------------- plain http
  console.log('a phone on plain http');
  // Any http origin other than localhost is insecure, like a phone opening the
  // dev server by LAN address. Serve the dev server under such a name by
  // answering its requests from the real one: no DNS, no LAN exposure.
  const lan = 'http://streetbiz-lan.test';
  const insecureContext = await browser.newContext({ viewport: { width: 430, height: 900 } });
  await insecureContext.route(`${lan}/**`, async (route) => {
    const response = await route.fetch({ url: route.request().url().replace(lan, ui) });
    await route.fulfill({ response });
  });
  const insecure = await insecureContext.newPage();
  await insecure.goto(`${lan}/`, { waitUntil: 'domcontentloaded' });
  const secure = await insecure.evaluate(() => window.isSecureContext);
  const hasCamera = await insecure.evaluate(() => Boolean(navigator.mediaDevices));
  check('setup: a LAN-style http origin is not a secure context and has no camera', secure === false && !hasCamera, `secure=${secure} camera=${hasCamera}`);
  await insecure.evaluate(signIn, sellerSession);
  await insecure.goto(`${lan}/vendor/orders/scan`, { waitUntil: 'load' });
  let blamed = false;
  try { await insecure.getByText(MSG.insecure).first().waitFor({ timeout: 8000 }); blamed = true; } catch { /* below */ }
  await insecure.screenshot({ path: output + '/msg-http-camera.png', fullPage: true });
  check('on plain http the screen blames http, not the phone', blamed,
    (await insecure.locator('body').innerText()).slice(0, 300));
  await insecureContext.close();

  // ---------------------------------------------------------------- rate limit (last: it locks typing for a minute)
  console.log('seller - guessing codes');
  let limited = null;
  for (let i = 0; i < 25 && !limited; i += 1) {
    const attempt = await call(seller, 'POST', '/vendor/orders/pickup-confirm', { code: 'ZZZZZZZZ' });
    if (attempt.status === 429) limited = attempt;
  }
  check('guessing is cut off with 429', Boolean(limited));
  await typeCode('ZZZZZZZZ');
  await expectOnScreen('the cut-off is explained in Vietnamese on the scan screen', MSG.tooMany, 'msg-typed-rate-limited');

  await browser.close();
  console.log('\nOrders used: ' + [orderId, early, closed, foreign].filter(Boolean).join(', '));
  if (failures.length) {
    console.log(`\n${failures.length} FAILED`);
    process.exit(1);
  }
  console.log('\nALL PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
