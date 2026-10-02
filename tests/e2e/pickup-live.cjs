/* global require, process, console, fetch */
/* The globals below appear inside addInitScript bodies, which run in the page. */
/* global localStorage, document, navigator, Image, setInterval */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser check for ORD-06 order pickup, covering both routes a seller
// has: decoding the buyer's QR off the camera, and typing the short code when
// the camera is broken. Completes orders, so point it at a disposable database.
//
//   E2E_ALLOW_DB_MUTATION=1 \
//   PLAYWRIGHT_MODULE_PATH=<path to playwright> \
//   E2E_ORDER_ID=<an order in READY_FOR_PICKUP> \
//   E2E_ORDER_ID_TYPED=<a second one, for the typed short code> \
//   E2E_ORDER_ID_MANUAL=<a third one, no code at all> \
//   E2E_ARTIFACTS=<screenshot folder> \
//   node tests/e2e/pickup-live.cjs
//
// The order is consumed by the camera route, so the script puts it back into
// READY_FOR_PICKUP through the seller's own endpoints before testing the typed
// route - no direct database surgery.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const api = process.env.E2E_API_URL || 'http://localhost:5023/api';
const ui = process.env.E2E_UI_URL || 'http://localhost:5173';
const output = process.env.E2E_ARTIFACTS;
const orderId = process.env.E2E_ORDER_ID;
const typedOrderId = process.env.E2E_ORDER_ID_TYPED;
const manualOrderId = process.env.E2E_ORDER_ID_MANUAL;
const password = process.env.E2E_PASSWORD || 'Password123!';
const buyerPhone = process.env.E2E_CUSTOMER_PHONE || '0905000202';
const sellerPhone = process.env.E2E_VENDOR_PHONE || '0905000101';

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

/** Seeds the seller's session into a fresh context. */
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

(async () => {
  const buyer = await login(buyerPhone);
  const seller = await login(sellerPhone);

  const first = await call(buyer.accessToken, 'GET', `/orders/${orderId}/pickup-code`);
  assert.equal(first.status, 200, 'order must be waiting for collection: ' + JSON.stringify(first.body));
  check('the API issues a QR token and a typeable short code',
    Boolean(first.body.token) && /^[0-9A-HJKMNP-TV-Z]{8}$/.test(first.body.shortCode || ''),
    JSON.stringify(first.body));

  const browser = await chromium.launch();

  // ---- the buyer's screen carries both ----
  const buyerContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  await buyerContext.addInitScript(signIn, buyer);
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`${ui}/customer/orders/${orderId}`, { waitUntil: 'networkidle' });
  await buyerPage.waitForSelector('[data-testid="qr-code"]');
  await buyerPage.waitForTimeout(1000);
  check('the buyer sees a QR', (await buyerPage.locator('[data-testid="qr-code"]').count()) > 0);
  check('the buyer sees the short code to read out',
    (await buyerPage.locator(`text=${first.body.shortCode}`).count()) > 0);
  await buyerPage.screenshot({ path: output + '/pickup-buyer-codes.png' });
  // Photograph the QR exactly as a seller's camera would see it.
  await buyerPage.locator('[data-testid="qr-code"]').screenshot({ path: output + '/pickup-qr.png' });
  await buyerContext.close();

  // ---- route 1: the camera ----
  console.log('route 1 - the camera decodes the QR');
  const qrDataUrl = 'data:image/png;base64,' + fs.readFileSync(output + '/pickup-qr.png').toString('base64');
  const camContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  await camContext.addInitScript(signIn, seller);
  // A canvas stands in for the lens. Everything downstream - the video element,
  // the frame grab and jsQR - is the application's own code.
  await camContext.addInitScript((dataUrl) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    let loaded = false;
    image.onload = () => { loaded = true; };
    image.src = dataUrl;
    // A steady timer rather than requestAnimationFrame, which is throttled
    // before the page settles and would leave the stream blank.
    setInterval(() => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (loaded) ctx.drawImage(image, 100, 20, 440, 440);
    }, 100);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      // A fresh stream per call, like a real camera: StrictMode mounts the
      // scanner twice in dev and the first unmount stops the tracks it was given.
      value: { getUserMedia: async () => canvas.captureStream(10) },
    });
  }, qrDataUrl);

  const camPage = await camContext.newPage();
  await camPage.goto(`${ui}/vendor/orders/scan`, { waitUntil: 'networkidle' });
  let scanned = false;
  for (let i = 0; i < 25 && !scanned; i += 1) {
    await camPage.waitForTimeout(700);
    scanned = (await camPage.locator('text=Đã giao đơn cho khách').count()) > 0;
  }
  check('the camera hands the order over with no typing', scanned);
  await camPage.screenshot({ path: output + '/pickup-camera.png' });
  await camContext.close();

  const afterCamera = await call(buyer.accessToken, 'GET', `/orders/${orderId}`);
  check('the order is COMPLETED after the scan',
    afterCamera.body.orderStatus === 'COMPLETED', afterCamera.body.orderStatus);

  // ---- route 2: no camera, the seller types it ----
  if (!typedOrderId) {
    console.log('  SKIP  typed route (set E2E_ORDER_ID_TYPED to a second waiting order)');
  } else {
    console.log('route 2 - the seller types the code');
    const second = await call(buyer.accessToken, 'GET', `/orders/${typedOrderId}/pickup-code`);
    assert.equal(second.status, 200,
      'E2E_ORDER_ID_TYPED must also be waiting for collection: ' + JSON.stringify(second.body));
    const typedContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      timezoneId: 'Asia/Ho_Chi_Minh',
    });
    await typedContext.addInitScript(signIn, seller);
    // No camera at all: exactly the situation this route exists for.
    await typedContext.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    });
    const typedPage = await typedContext.newPage();
    await typedPage.goto(`${ui}/vendor/orders/scan`, { waitUntil: 'networkidle' });
    await typedPage.waitForTimeout(800);
    check('with no camera the seller is still offered the code field',
      (await typedPage.getByLabel('Mã nhận hàng').count()) > 0);

    await typedPage.getByLabel('Mã nhận hàng').fill('ZZZZZZZZ');
    await typedPage.getByRole('button', { name: 'Xác nhận giao đơn' }).click();
    await typedPage.waitForTimeout(1800);
    check('a code matching nothing is refused',
      (await typedPage.locator('text=Đã giao đơn cho khách').count()) === 0);

    await typedPage.getByRole('button', { name: 'Thử lại' }).click().catch(() => undefined);
    // Typed the way a person would: lower case, with a space in the middle.
    const asTyped = `${second.body.shortCode.slice(0, 4)} ${second.body.shortCode.slice(4)}`.toLowerCase();
    await typedPage.getByLabel('Mã nhận hàng').fill(asTyped);
    await typedPage.getByRole('button', { name: 'Xác nhận giao đơn' }).click();
    await typedPage.waitForTimeout(2500);
    check('the typed code hands the order over, however it was typed',
      (await typedPage.locator('text=Đã giao đơn cho khách').count()) > 0, asTyped);
    await typedPage.screenshot({ path: output + '/pickup-typed.png' });
    await typedContext.close();

    const afterTyped = await call(buyer.accessToken, 'GET', `/orders/${typedOrderId}`);
    check('the order is COMPLETED after the typed handover',
      afterTyped.body.orderStatus === 'COMPLETED', afterTyped.body.orderStatus);
  }

  // ---- route 3: no code at all, on a written reason ----
  if (!manualOrderId) {
    console.log('  SKIP  manual route (set E2E_ORDER_ID_MANUAL to a third waiting order)');
  } else {
    console.log('route 3 - the buyer has no code and the seller writes down why');
    const manualContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      timezoneId: 'Asia/Ho_Chi_Minh',
    });
    await manualContext.addInitScript(signIn, seller);
    const manualPage = await manualContext.newPage();
    await manualPage.goto(`${ui}/vendor/orders/${manualOrderId}`, { waitUntil: 'networkidle' });
    await manualPage.waitForTimeout(800);

    await manualPage.getByRole('button', { name: 'Khách không có mã' }).click();
    await manualPage.waitForTimeout(500);
    check('the seller is warned the reason goes on the order',
      (await manualPage.locator('text=lưu vào lịch sử đơn').count()) > 0);
    const confirm = manualPage.getByRole('button', { name: 'Xác nhận đã giao đơn' });
    check('with no reason written the handover is not offered', await confirm.isDisabled());

    // A scribble is not a reason: the buyer reads whatever is written here.
    await manualPage.getByLabel('Lý do giao đơn không có mã').fill('x');
    await manualPage.waitForTimeout(200);
    check('a one-letter reason is still refused', await confirm.isDisabled());

    const reason = 'Khách hết pin điện thoại, đã đối chiếu tên và món';
    await manualPage.getByLabel('Lý do giao đơn không có mã').fill(reason);
    await manualPage.waitForTimeout(200);
    await manualPage.screenshot({ path: output + '/pickup-manual-reason.png' });
    await confirm.click();
    await manualPage.waitForTimeout(2500);
    await manualPage.screenshot({ path: output + '/pickup-manual-done.png' });
    await manualContext.close();

    const afterManual = await call(buyer.accessToken, 'GET', `/orders/${manualOrderId}`);
    check('the order is COMPLETED after the written handover',
      afterManual.body.orderStatus === 'COMPLETED', afterManual.body.orderStatus);
    // The whole price of skipping the code is that the buyer sees why.
    const completion = (afterManual.body.statusHistory || [])
      .find((entry) => entry.toStatus === 'COMPLETED');
    check('the buyer reads the reason on the order',
      Boolean(completion && (completion.note || '').includes(reason)),
      JSON.stringify(completion));

    const buyerView = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      timezoneId: 'Asia/Ho_Chi_Minh',
    });
    await buyerView.addInitScript(signIn, buyer);
    const buyerDetail = await buyerView.newPage();
    await buyerDetail.goto(`${ui}/customer/orders/${manualOrderId}`, { waitUntil: 'networkidle' });
    await buyerDetail.waitForTimeout(1200);
    check('the reason reaches the buyer own screen, not just the API',
      (await buyerDetail.locator(`text=${reason}`).count()) > 0);
    await buyerDetail.screenshot({ path: output + '/pickup-manual-buyer.png', fullPage: true });
    await buyerView.close();
  }

  await browser.close();
  console.log(failures.length ? '\nFAILED: ' + failures.join(', ') : '\nALL CHECKS PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
