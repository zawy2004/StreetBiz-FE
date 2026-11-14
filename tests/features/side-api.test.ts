import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearTokens, setTokens } from '@/core/api/token-storage';
import { SideApiError, sideApi, sideRequest } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

// SIDE-01..13 client: one fetch wrapper for every slot/rental call.
const fetchMock = vi.fn();

function reply(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)! as [string, RequestInit];
  return { url, init, headers: (init.headers ?? {}) as Record<string, string> };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  setTokens({ accessToken: 'tok-1', refreshToken: 'r', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' });
  useAuthStore.setState({ user: null, sessionExpired: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearTokens();
});

describe('sideRequest', () => {
  it('sends the bearer token and a JSON content type only when there is a body', async () => {
    fetchMock.mockReturnValueOnce(reply(200, [])).mockReturnValueOnce(reply(200, {}));

    await sideRequest('/sidewalk-slots');
    const get = lastCall();
    expect(get.url).toBe('http://localhost:5000/api/sidewalk-slots');
    expect(get.headers.Authorization).toBe('Bearer tok-1');
    expect(get.headers['Content-Type']).toBeUndefined();

    await sideRequest('/vendor/slot-holds', { method: 'POST', body: '{}' });
    expect(lastCall().headers['Content-Type']).toBe('application/json');
  });

  it('omits the Authorization header when there is no token', async () => {
    clearTokens();
    fetchMock.mockReturnValueOnce(reply(200, []));

    await sideRequest('/sidewalk-slots');

    expect(lastCall().headers.Authorization).toBeUndefined();
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockReturnValueOnce(reply(204));

    await expect(sideRequest('/x')).resolves.toBeUndefined();
  });

  it('prefers the first validation message, then detail, then title', async () => {
    fetchMock
      .mockReturnValueOnce(reply(400, { title: 'T', detail: 'D', errors: { Latitude: ['Vĩ độ không hợp lệ.'] } }))
      .mockReturnValueOnce(reply(422, { title: 'T', detail: 'Ô đã có người thuê.' }))
      .mockReturnValueOnce(reply(409, { title: 'Xung đột' }));

    await expect(sideRequest('/a')).rejects.toMatchObject({ status: 400, message: 'Vĩ độ không hợp lệ.' });
    await expect(sideRequest('/b')).rejects.toMatchObject({ status: 422, message: 'Ô đã có người thuê.' });
    await expect(sideRequest('/c')).rejects.toMatchObject({ status: 409, message: 'Xung đột' });
  });

  it.each([
    [403, 'Bạn không có quyền thực hiện thao tác này.'],
    [409, 'Yêu cầu xung đột với trạng thái hiện tại.'],
    [422, 'Không thoả điều kiện nghiệp vụ.'],
    [500, 'Không thể xử lý yêu cầu.'],
  ])('falls back to a Vietnamese message for a bare %i', async (status, message) => {
    fetchMock.mockReturnValueOnce(Promise.resolve(new Response('not json', { status })));

    const error = await sideRequest('/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SideApiError);
    expect(error).toMatchObject({ status, message });
  });

  it('turns a network failure into status 0 with a connection hint', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(sideRequest('/x')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Không kết nối được Backend') });
  });

  it('a 401 for the current token ends the session so RoleGuard sends the user to sign-in', async () => {
    useAuthStore.setState({ user: { id: '1', fullName: 'A', phone: '0905000002', password: '', role_code: 'VENDOR', account_status: 'ACTIVE' } });
    fetchMock.mockReturnValueOnce(reply(401, {}));

    await expect(sideRequest('/vendor/rental-contracts')).rejects.toMatchObject({ status: 401 });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionExpired).toBe(true);
  });

  it('a 401 for some other, explicitly passed token leaves the current session alone', async () => {
    const user = { id: '1', fullName: 'A', phone: '0905000002', password: '', role_code: 'VENDOR' as const, account_status: 'ACTIVE' as const };
    useAuthStore.setState({ user });
    fetchMock.mockReturnValueOnce(reply(401, {}));

    await expect(sideRequest('/x', {}, 'someone-elses-token')).rejects.toMatchObject({ status: 401 });

    expect(useAuthStore.getState().user).toEqual(user);
  });
});

describe('sideApi endpoints', () => {
  beforeEach(() => fetchMock.mockImplementation(() => reply(200, {})));

  it('builds the slot-map query and drops undefined filters', async () => {
    await sideApi.searchSlots({ lat: 16.06, lng: 108.21, radiusMeters: 300, includeUnavailable: true, zoneId: undefined });

    const url = new URL(lastCall().url);
    expect(url.pathname).toBe('/api/sidewalk-slots');
    expect(url.searchParams.get('lat')).toBe('16.06');
    expect(url.searchParams.get('radiusMeters')).toBe('300');
    expect(url.searchParams.get('includeUnavailable')).toBe('true');
    expect(url.searchParams.has('zoneId')).toBe(false);
  });

  it('encodes values such as a phone number with a plus sign', async () => {
    await sideApi.requestTransfer({ contractId: 3, toVendorPhone: '+84905000003' });
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ contractId: 3, toVendorPhone: '+84905000003' });

    await sideApi.listTransfers('incoming');
    expect(new URL(lastCall().url).searchParams.get('direction')).toBe('incoming');
  });

  it.each([
    ['getSlot', () => sideApi.getSlot(4), 'GET', '/api/sidewalk-slots/4'],
    ['getZone', () => sideApi.getZone(2), 'GET', '/api/sidewalk-zones/2'],
    ['getSlotQuote', () => sideApi.getSlotQuote(4, 30), 'GET', '/api/sidewalk-slots/4/quote?termDays=30'],
    ['createHold', () => sideApi.createHold({ registrationId: 1, slotId: 4 }), 'POST', '/api/vendor/slot-holds'],
    ['releaseHold', () => sideApi.releaseHold(4, 1), 'DELETE', '/api/vendor/slot-holds/4?registrationId=1'],
    ['listHolds', () => sideApi.listHolds(1), 'GET', '/api/vendor/slot-holds?registrationId=1'],
    ['openSlot', () => sideApi.submitOpenSlotApplication({ registrationId: 1, slotId: 4, requestedTermDays: 90, commitmentsAccepted: true }), 'POST', '/api/vendor/rental-applications/open-slot'],
    ['adjacent', () => sideApi.submitAdjacentApplication({ registrationId: 1, slotId: 4, requestedTermDays: 90 }), 'POST', '/api/vendor/rental-applications/adjacent'],
    ['withdrawApplication', () => sideApi.withdrawApplication(7), 'POST', '/api/vendor/rental-applications/7/withdraw'],
    ['listContracts', () => sideApi.listContracts('ACTIVE'), 'GET', '/api/vendor/rental-contracts?status=ACTIVE'],
    ['requestRenewal', () => sideApi.requestRenewal(3, 60), 'POST', '/api/vendor/rental-contracts/3/renewals'],
    ['withdrawRenewal', () => sideApi.withdrawRenewal(3, 9), 'POST', '/api/vendor/rental-contracts/3/renewals/9/withdraw'],
    ['cancelContract', () => sideApi.cancelContract(3, 'Trả ô'), 'POST', '/api/vendor/rental-contracts/3/cancel'],
    ['getPermit', () => sideApi.getPermit(3), 'GET', '/api/vendor/rental-contracts/3/permit'],
    ['proposeSlot', () => sideApi.proposeSlot({ registrationId: 1, zoneId: 1, latitude: 16, longitude: 108, proposalPhotoUrl: '/p.jpg' }), 'POST', '/api/vendor/slot-proposals'],
    ['requestAddressChange', () => sideApi.requestAddressChange({ registrationId: 1, newAddress: '45 Hoàng Diệu' }), 'POST', '/api/vendor/address-changes'],
    ['acceptTransfer', () => sideApi.acceptTransfer(5), 'POST', '/api/vendor/slot-transfers/5/accept'],
    ['declineTransfer', () => sideApi.declineTransfer(5), 'POST', '/api/vendor/slot-transfers/5/decline'],
  ])('%s calls %s %s', async (_name, call, method, path) => {
    await call();

    const { url, init } = lastCall();
    expect(init.method ?? 'GET').toBe(method);
    const parsed = new URL(url);
    expect(parsed.pathname + parsed.search).toBe(path);
  });

  it('sends the renewal term and cancellation reason in the body', async () => {
    await sideApi.requestRenewal(3, 60);
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ requestedTermDays: 60 });

    await sideApi.cancelContract(3, null);
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ reason: null });
  });
});
