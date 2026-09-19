/* global require, process, console, fetch, localStorage */
/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in destructive smoke test: use disposable accounts and a test database only.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.E2E_API_URL || 'http://127.0.0.1:5091/api';
const ui = process.env.E2E_UI_URL || 'http://127.0.0.1:5173';
const output = process.env.E2E_ARTIFACTS;
assert.equal(
  process.env.E2E_ALLOW_DB_MUTATION,
  '1',
  'Set E2E_ALLOW_DB_MUTATION=1 for a disposable database.',
);
for (const key of [
  'E2E_VENDOR_PHONE',
  'E2E_CUSTOMER_PHONE',
  'E2E_ADMIN_PHONE',
  'E2E_PASSWORD',
  'E2E_CONTRACT_ID',
  'E2E_ARTIFACTS',
])
  assert.ok(process.env[key], 'Missing ' + key);
require('node:fs').mkdirSync(output, { recursive: true });
const run = Date.now();
async function api(auth, method, route, data, expected = 200) {
  const r = await fetch(base + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: 'Bearer ' + auth.accessToken } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await r.text();
  assert.equal(r.status, expected, method + ' ' + route + ': ' + body);
  return body ? JSON.parse(body) : null;
}
async function login(phone) {
  return api(null, 'POST', '/auth/login', {
    phoneNumber: phone,
    password: process.env.E2E_PASSWORD,
  });
}
(async () => {
  const vendor = await login(process.env.E2E_VENDOR_PHONE);
  const customer = await login(process.env.E2E_CUSTOMER_PHONE);
  const admin = await login(process.env.E2E_ADMIN_PHONE);
  assert.equal(
    (await api(customer, 'GET', '/orders/payment-options')).mode,
    'SANDBOX',
    'Development sandbox must be enabled.',
  );
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  async function pageFor(auth) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      timezoneId: 'Asia/Ho_Chi_Minh',
    });
    await context.addInitScript((auth) => {
      localStorage.setItem('streetbiz-tokens', JSON.stringify(auth));
      const u = auth.user;
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
    const p = await context.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    return p;
  }
  const seller = await pageFor(vendor);
  const buyer = await pageFor(customer);
  try {
    await seller.goto(ui + '/vendor/store');
    let stores = await api(vendor, 'GET', '/seller/storefronts');
    let store = stores.find((s) => s.contractId === Number(process.env.E2E_CONTRACT_ID));
    if (!store) {
      await seller.getByRole('button', { name: 'Tạo gian hàng', exact: true }).click();
      const contracts = await api(vendor, 'GET', '/vendor/rental-contracts?status=ACTIVE');
      const contract = contracts.find((c) => c.contractId === Number(process.env.E2E_CONTRACT_ID));
      assert.ok(contract, 'Vendor must own the selected active contract.');
      await seller.getByRole('radio', { name: new RegExp(contract.slotCode) }).click();
      await seller.getByLabel('Tên gian hàng', { exact: true }).fill('E2E Commerce Kitchen');
      await seller
        .getByLabel('Mô tả', { exact: true })
        .fill('Gian hàng kiểm thử bán hàng, đơn và thanh toán sandbox.');
      const response = seller.waitForResponse(
        (r) => r.url().endsWith('/seller/storefronts') && r.request().method() === 'POST',
      );
      await seller.getByRole('button', { name: 'Lưu gian hàng', exact: true }).click();
      const created = await response;
      assert.equal(created.status(), 200, await created.text());
      store = await created.json();
    }
    console.log('storeId=' + store.storefrontId);
    await seller.screenshot({ path: path.join(output, '01-store.png'), fullPage: true });
    await seller.goto(ui + '/vendor/store/menu?storefrontId=' + store.storefrontId);
    const itemName = 'E2E Cơm gà ' + run;
    await seller.getByLabel('Tên món', { exact: true }).fill(itemName);
    await seller.getByLabel('Giá (đ)', { exact: true }).fill('25000');
    await seller.getByLabel('Mô tả món', { exact: true }).fill('Món phục vụ kiểm thử.');
    const menuResponse = seller.waitForResponse(
      (r) => r.url().endsWith('/menu-items') && r.request().method() === 'POST',
    );
    await seller.getByRole('button', { name: 'Thêm món', exact: true }).click();
    const mr = await menuResponse;
    assert.equal(mr.status(), 200, await mr.text());
    const item = await mr.json();
    const storeUrl = '/seller/storefronts/' + store.storefrontId;
    const itemUrl = storeUrl + '/menu-items/' + item.menuItemId;
    await api(vendor, 'PUT', storeUrl, { ...store, availabilityStatus: 'PAUSED' });
    await api(null, 'GET', '/marketplace/menu-items/' + item.menuItemId, undefined, 404);
    await api(vendor, 'PUT', storeUrl, { ...store, availabilityStatus: 'OPEN' });
    await api(vendor, 'PUT', itemUrl, { ...item, availabilityStatus: 'SOLD_OUT' });
    await api(customer, 'POST', '/cart/items', { menuItemId: item.menuItemId, quantity: 1 }, 422);
    await api(vendor, 'PUT', itemUrl, { ...item, availabilityStatus: 'AVAILABLE' });
    await seller.getByRole('heading', { name: itemName, exact: true }).waitFor();
    await seller.screenshot({ path: path.join(output, '02-menu.png'), fullPage: true });
    await api(customer, 'GET', '/seller/storefronts', undefined, 403);
    if (process.env.E2E_FOREIGN_STOREFRONT_ID)
      await api(
        vendor,
        'GET',
        '/seller/storefronts/' + process.env.E2E_FOREIGN_STOREFRONT_ID + '/menu-items',
        undefined,
        404,
      );
    await api(customer, 'DELETE', '/cart', undefined, 204);
    await buyer.goto(ui + '/customer/explore/items/' + item.menuItemId);
    await buyer.getByRole('button', { name: /Thêm vào giỏ/i }).click();
    await buyer.waitForURL('**/customer/explore/cart');
    await buyer.goto(ui + '/customer/checkout');
    const orderResponse = buyer.waitForResponse(
      (r) => r.url().endsWith('/orders') && r.request().method() === 'POST',
    );
    await buyer.getByRole('button', { name: 'Tiếp tục thanh toán qua MOMO', exact: true }).click();
    const or = await orderResponse;
    assert.equal(or.status(), 200, await or.text());
    const order = await or.json();
    console.log('orderId=' + order.orderId + ', itemId=' + item.menuItemId);
    assert.equal(order.orderStatus, 'PENDING_PAYMENT');
    assert.match(order.createdAt, /Z$/, 'Order UTC timestamp must include Z');
    assert.equal(
      (await api(vendor, 'GET', '/seller/orders')).some((o) => o.orderId === order.orderId),
      false,
    );
    await buyer.getByRole('button', { name: 'Mô phỏng thanh toán thất bại', exact: true }).click();
    await buyer.getByRole('button', { name: 'Thử lại thanh toán sandbox', exact: true }).waitFor();
    await buyer.reload();
    await buyer.getByRole('button', { name: 'Thử lại thanh toán sandbox', exact: true }).waitFor();
    await buyer.screenshot({ path: path.join(output, '03-payment-retry.png'), fullPage: true });
    await buyer.getByRole('button', { name: 'Thử lại thanh toán sandbox', exact: true }).click();
    await buyer.waitForURL('**/customer/orders/' + order.orderId);
    await seller.goto(ui + '/vendor/store/orders');
    // Use the closest card ancestor containing the order code.
    const orderCard = seller
      .locator('div.shadow-card')
      .filter({ has: seller.getByText('#' + order.orderCode, { exact: true }) })
      .first();
    await orderCard.getByRole('button', { name: 'Nhận đơn', exact: true }).click();
    await orderCard.getByRole('button', { name: 'Bắt đầu chuẩn bị', exact: true }).click();
    await orderCard.getByRole('button', { name: 'Sẵn sàng lấy món', exact: true }).click();
    await seller.screenshot({ path: path.join(output, '04-seller-ready.png'), fullPage: true });
    await buyer.reload();
    await buyer.getByRole('button', { name: 'Đã nhận món', exact: true }).click();
    await buyer.getByRole('button', { name: 'Đánh giá đơn hàng', exact: true }).waitFor();
    assert.equal((await api(customer, 'GET', '/orders/' + order.orderId)).orderStatus, 'COMPLETED');
    await buyer.screenshot({ path: path.join(output, '05-completed.png'), fullPage: true });
    await buyer.goto(ui + '/customer/orders/' + order.orderId + '/review');
    await buyer.getByRole('button', { name: '4 sao', exact: true }).click();
    await buyer.getByLabel('Nhận xét', { exact: true }).fill('E2E món ăn ổn, cần phản hồi.');
    await buyer.getByRole('button', { name: 'Lưu đánh giá', exact: true }).click();
    await buyer.waitForURL('**/customer/orders/' + order.orderId);
    assert.equal((await api(customer, 'GET', '/orders/' + order.orderId + '/review')).rating, 4);
    await buyer.goto(ui + '/customer/orders/' + order.orderId + '/complaint');
    await buyer.getByRole('radio', { name: 'Yêu cầu hoàn tiền', exact: true }).click();
    await buyer.getByLabel('Mô tả chi tiết', { exact: true }).fill('E2E hoàn một phần 5000đ.');
    await buyer.getByLabel('Số tiền yêu cầu hoàn (đ)', { exact: true }).fill('5000');
    await buyer.getByRole('button', { name: 'Gửi khiếu nại', exact: true }).click();
    await buyer
      .getByText('Khiếu nại đang được xử lý. Kết quả sẽ hiển thị tại đây.', { exact: true })
      .waitFor();
    await buyer.screenshot({ path: path.join(output, '06-complaint.png'), fullPage: true });
    const complaint = (await api(customer, 'GET', '/orders/' + order.orderId + '/complaints'))[0];
    console.log('complaintId=' + complaint.complaintId);
    await api(admin, 'POST', '/platform/order-complaints/' + complaint.complaintId + '/decision', {
      decision: 'RESOLVE',
      notes: 'E2E đồng ý hoàn một phần',
      expectedStatus: 'OPEN',
      approvedRefundAmount: 5000,
    });
    await buyer.goto(ui + '/customer/orders/' + order.orderId);
    await buyer.getByRole('button', { name: 'Mô phỏng hoàn tiền sandbox', exact: true }).click();
    await buyer.getByText('ĐÃ HOÀN TIỀN', { exact: true }).waitFor();
    const complaintButton = buyer.getByRole('button', {
      name: 'Khiếu nại / Yêu cầu hoàn tiền',
      exact: true,
    });
    await complaintButton.scrollIntoViewIfNeeded();
    assert.ok(
      (await complaintButton.boundingBox()).height >= 48,
      'Scrollable screen must not shrink the action button.',
    );
    await buyer.screenshot({ path: path.join(output, '07-refunded.png'), fullPage: true });
    assert.equal((await api(customer, 'GET', '/orders/' + order.orderId)).refundStatus, 'SUCCESS');
    await api(customer, 'POST', '/orders/' + order.orderId + '/refund/sandbox-confirm');
    assert.equal(
      (await api(customer, 'POST', '/orders/' + order.orderId + '/payment/sandbox-confirm'))
        .orderStatus,
      'COMPLETED',
    );
    await api(customer, 'POST', '/cart/items', { menuItemId: item.menuItemId, quantity: 1 });
    const cancel = await api(customer, 'POST', '/orders', {
      provider: 'ZALOPAY',
      idempotencyKey: 'e2e-cancel-' + run,
    });
    await api(customer, 'POST', '/orders/' + cancel.orderId + '/payment/sandbox-confirm');
    await api(customer, 'POST', '/orders/' + cancel.orderId + '/cancel', {
      expectedStatus: 'PLACED',
    });
    assert.equal(
      (await api(customer, 'POST', '/orders/' + cancel.orderId + '/refund/sandbox-confirm'))
        .refundAmount,
      25000,
    );
    await api(
      customer,
      'POST',
      '/orders/' + cancel.orderId + '/payment/sandbox-fail',
      undefined,
      409,
    );
    await api(
      vendor,
      'DELETE',
      '/seller/storefronts/' + store.storefrontId + '/menu-items/' + item.menuItemId,
      undefined,
      204,
    );
    await api(null, 'GET', '/marketplace/menu-items/' + item.menuItemId, undefined, 404);
    await seller.goto(ui + '/vendor/store/sales');
    await seller.getByText('Doanh thu thuần', { exact: true }).waitFor();
    await seller.screenshot({ path: path.join(output, '08-sales.png'), fullPage: true });
    const sales = await api(vendor, 'GET', '/seller/orders/sales-summary?period=DAY');
    assert.equal(sales.netSales, sales.grossSales - sales.refundedAmount);
    console.log('cancelOrderId=' + cancel.orderId + ', netSales=' + sales.netSales);
    console.log('ERRORS', errors);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: store/menu/cart/checkout/failure-retry/seller/pickup/review/complaint UI on SQL Server',
    );
  } catch (e) {
    await buyer.screenshot({ path: path.join(output, 'failure-buyer.png'), fullPage: true });
    await seller.screenshot({ path: path.join(output, 'failure-seller.png'), fullPage: true });
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
