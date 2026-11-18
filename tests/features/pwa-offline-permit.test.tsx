import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import { SideApiError, type RentalContract } from '@/core/api/side-api';
import { clearTokens, setTokens } from '@/core/api/token-storage';
import { isNoSignal } from '@/core/pwa/no-signal';
import {
  clearOfflinePermits,
  loadOfflinePermit,
  loadOfflinePermits,
  offlineStatus,
  saveOfflinePermit,
  type OfflinePermit,
} from '@/core/pwa/permit-offline-store';
import { registerServiceWorker } from '@/core/pwa/register-sw';
import { useAuthStore } from '@/store/auth-store';

const api = vi.hoisted(() => ({ getContract: vi.fn(), getPermit: vi.fn() }));
vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, ...api } };
});

const { DigitalPermitScreen } =
  await import('@/features/rental-contracts/screens/DigitalPermitScreen');

const permit = (over: Partial<OfflinePermit> = {}): OfflinePermit => ({
  permitId: 9,
  contractId: 5,
  qrPayload: 'SBP1.abc.def',
  qrUrl: null,
  slotCode: 'NVL-14',
  zoneName: 'Đường Nguyễn Văn Linh',
  startDate: '2026-09-01',
  endDate: '2027-12-01',
  effectiveStatus: 'VALID',
  contractStatus: 'ACTIVE',
  savedAt: Date.parse('2026-11-18T00:42:00Z'),
  ...over,
});

beforeEach(() => localStorage.clear());

describe('the permit kept for offline use', () => {
  it('saves and reads back one permit per contract, newest read first', () => {
    saveOfflinePermit('7', permit({ savedAt: 1000 }));
    saveOfflinePermit(
      '7',
      permit({ contractId: 6, permitId: 10, qrPayload: 'SBP1.other', savedAt: 2000 }),
    );
    saveOfflinePermit('7', permit({ savedAt: 3000, effectiveStatus: 'SUSPENDED' }));

    const all = loadOfflinePermits('7');
    expect(all.map((p) => [p.contractId, p.savedAt])).toEqual([
      [5, 3000],
      [6, 2000],
    ]);
    expect(loadOfflinePermit('7', 5)?.effectiveStatus).toBe('SUSPENDED');
  });

  it('keeps each user to their own copy', () => {
    saveOfflinePermit('7', permit());

    expect(loadOfflinePermits('8')).toEqual([]);
    expect(loadOfflinePermits(undefined)).toEqual([]);
  });

  it('keeps nothing about identity: only what is printed on the permit', () => {
    saveOfflinePermit('7', permit());

    const stored = localStorage.getItem('streetbiz:permit:7')!;
    expect(Object.keys(JSON.parse(stored)[0]).sort()).toEqual([
      'contractId',
      'contractStatus',
      'effectiveStatus',
      'endDate',
      'permitId',
      'qrPayload',
      'qrUrl',
      'savedAt',
      'slotCode',
      'startDate',
      'zoneName',
    ]);
  });

  it('ignores a damaged or tampered record instead of crashing', () => {
    localStorage.setItem('streetbiz:permit:7', '{not json');
    expect(loadOfflinePermits('7')).toEqual([]);
    localStorage.setItem(
      'streetbiz:permit:7',
      JSON.stringify([{ contractId: 5 }, 'x', null, permit()]),
    );
    expect(loadOfflinePermits('7')).toHaveLength(1);
    localStorage.setItem('streetbiz:permit:7', JSON.stringify({ not: 'an array' }));
    expect(loadOfflinePermits('7')).toEqual([]);
  });

  it('removes every copy of every user when told to', () => {
    saveOfflinePermit('7', permit());
    saveOfflinePermit('8', permit());
    localStorage.setItem('unrelated', 'keep');

    clearOfflinePermits();

    expect(loadOfflinePermits('7')).toEqual([]);
    expect(loadOfflinePermits('8')).toEqual([]);
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });

  it('is removed with the tokens: on sign-out and when the session ends', () => {
    setTokens({
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiresAtUtc: '2030-01-01T00:00:00Z',
    });
    saveOfflinePermit('7', permit());

    clearTokens();

    expect(loadOfflinePermits('7')).toEqual([]);
  });

  it('survives storage being blocked', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveOfflinePermit('7', permit())).not.toThrow();
    setItem.mockRestore();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadOfflinePermits('7')).toEqual([]);
    getItem.mockRestore();
  });

  describe('the status shown from a saved copy', () => {
    // 2027-12-01 is the last day; Vietnam's day ends at 17:00 UTC.
    const lastDay = permit({ endDate: '2027-12-01' });

    it('stays valid through the last day in Vietnam, then reads expired', () => {
      expect(offlineStatus(lastDay, Date.parse('2027-12-01T16:59:00Z'))).toBe('VALID');
      expect(offlineStatus(lastDay, Date.parse('2027-12-01T17:00:00Z'))).toBe('EXPIRED');
    });

    it('is never made more valid than the server said', () => {
      for (const status of ['SUSPENDED', 'REVOKED', 'EXPIRED', 'NOT_YET_VALID']) {
        expect(
          offlineStatus(permit({ effectiveStatus: status }), Date.parse('2026-12-01T00:00:00Z')),
        ).toBe(status);
      }
    });
  });
});

describe('no signal', () => {
  it('is a paused request or a network error, never a real answer from the server', () => {
    expect(isNoSignal({ fetchStatus: 'paused', isError: false, error: null })).toBe(true);
    expect(
      isNoSignal({
        fetchStatus: 'idle',
        isError: true,
        error: new ApiError('network_error', 0, 'x'),
      }),
    ).toBe(true);
    expect(
      isNoSignal({
        fetchStatus: 'idle',
        isError: true,
        error: new ApiError('not_found', 404, 'x'),
      }),
    ).toBe(false);
    expect(isNoSignal({ fetchStatus: 'fetching', isError: false, error: null })).toBe(false);
    // The permit and contract calls go through their own client, whose "no response" is status 0.
    expect(
      isNoSignal({
        fetchStatus: 'idle',
        isError: true,
        error: new SideApiError(0, 'Không kết nối được Backend.'),
      }),
    ).toBe(true);
    expect(
      isNoSignal({ fetchStatus: 'idle', isError: true, error: new SideApiError(404, 'x') }),
    ).toBe(false);
    expect(isNoSignal({ fetchStatus: 'idle', isError: true, error: new Error('boom') })).toBe(
      false,
    );
  });
});

describe('registering the service worker', () => {
  const fakeWindow = (state: 'loading' | 'complete') => {
    const register = vi.fn().mockResolvedValue({});
    const listeners: Record<string, () => void> = {};
    const win = {
      navigator: { serviceWorker: { register } },
      document: { readyState: state },
      addEventListener: (name: string, fn: () => void) => (listeners[name] = fn),
    } as unknown as Window;
    return { win, register, listeners };
  };

  it('registers /sw.js at the root scope once the page has loaded, in a production build', () => {
    const { win, register, listeners } = fakeWindow('loading');
    registerServiceWorker(win, true);
    expect(register).not.toHaveBeenCalled();
    listeners.load!();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('registers at once when the page is already loaded', () => {
    const { win, register } = fakeWindow('complete');
    registerServiceWorker(win, true);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('does nothing in development, or where service workers do not exist', () => {
    const dev = fakeWindow('complete');
    registerServiceWorker(dev.win, false);
    expect(dev.register).not.toHaveBeenCalled();
    expect(() =>
      registerServiceWorker(
        { navigator: {}, document: { readyState: 'complete' } } as unknown as Window,
        true,
      ),
    ).not.toThrow();
  });

  it('keeps quiet when registration fails', async () => {
    const win = {
      navigator: { serviceWorker: { register: vi.fn().mockRejectedValue(new Error('blocked')) } },
      document: { readyState: 'complete' },
    } as unknown as Window;
    expect(() => registerServiceWorker(win, true)).not.toThrow();
    await Promise.resolve();
  });
});

/** public/sw.js run in a sandbox with a fake Cache API: what it caches, and what it leaves alone. */
describe('the service worker', () => {
  const source = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf8');

  function load() {
    const stores = new Map<string, Map<string, Response>>();
    const cacheOf = (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const map = stores.get(name)!;
      const keyOf = (r: Request | string) => (typeof r === 'string' ? r : new URL(r.url).pathname);
      return {
        match: async (r: Request | string) => map.get(keyOf(r))?.clone(),
        put: async (r: Request | string, res: Response) => void map.set(keyOf(r), res),
        keys: async () => [...map.keys()].map((k) => new Request(`https://app.test${k}`)),
        delete: async (r: Request | string) => map.delete(keyOf(r)),
      };
    };
    const handlers: Record<string, (event: unknown) => void> = {};
    const net = { fetch: vi.fn<(r: Request) => Promise<Response>>() };
    const sandbox = {
      self: {
        location: { origin: 'https://app.test' },
        addEventListener: (type: string, fn: (event: unknown) => void) => (handlers[type] = fn),
        skipWaiting: vi.fn(),
        clients: { claim: vi.fn() },
      },
      caches: {
        open: async (name: string) => cacheOf(name),
        keys: async () => [...stores.keys()],
        delete: async (name: string) => stores.delete(name),
        match: async (r: string, opts?: { cacheName?: string }) =>
          opts?.cacheName ? cacheOf(opts.cacheName).match(r) : undefined,
      },
      fetch: (r: Request) => net.fetch(r),
      URL,
      Request,
    };
    vm.runInNewContext(source, sandbox);
    const handle = (request: Request) => {
      let response: Promise<Response> | undefined;
      handlers.fetch!({ request, respondWith: (p: Promise<Response>) => (response = p) });
      return response;
    };
    return { handle, net, stores, handlers, sandbox };
  }

  const page = (body = '<html></html>') =>
    new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  const nav = (path = '/vendor') =>
    ({ url: `https://app.test${path}`, method: 'GET', mode: 'navigate' }) as unknown as Request;
  const get = (url: string) => ({ url, method: 'GET', mode: 'cors' }) as unknown as Request;

  it('opens a page from the network when there is one, and remembers it', async () => {
    const sw = load();
    sw.net.fetch.mockResolvedValue(page('<html>new deploy</html>'));

    const response = await sw.handle(nav())!;

    expect(await response.text()).toBe('<html>new deploy</html>');
    expect(await sw.stores.get('streetbiz-shell-v1')!.get('/index.html')!.text()).toBe(
      '<html>new deploy</html>',
    );
  });

  it('opens the last remembered page when there is no signal', async () => {
    const sw = load();
    sw.net.fetch.mockResolvedValueOnce(page('<html>last shell</html>'));
    await sw.handle(nav('/vendor'));
    sw.net.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const response = await sw.handle(nav('/vendor/slots/contracts/5/permit'))!;

    expect(await response!.text()).toBe('<html>last shell</html>');
  });

  it('lets the browser report the failure when nothing was remembered yet', async () => {
    const sw = load();
    sw.net.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(sw.handle(nav())).rejects.toThrow('Failed to fetch');
  });

  it('does not remember an error page or a non-HTML answer as the shell', async () => {
    const sw = load();
    sw.net.fetch.mockResolvedValueOnce(
      new Response('oops', { status: 502, headers: { 'content-type': 'text/html' } }),
    );
    await sw.handle(nav());
    sw.net.fetch.mockResolvedValueOnce(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    await sw.handle(nav());

    expect(sw.stores.get('streetbiz-shell-v1')?.size ?? 0).toBe(0);
  });

  it('serves a build file from the cache after the first load', async () => {
    const sw = load();
    sw.net.fetch.mockResolvedValue(new Response('console.log(1)', { status: 200 }));
    const request = get('https://app.test/assets/index-abc123.js');

    await sw.handle(request);
    sw.net.fetch.mockRejectedValue(new TypeError('offline'));
    const again = await sw.handle(request)!;

    expect(await again!.text()).toBe('console.log(1)');
    expect(sw.net.fetch).toHaveBeenCalledTimes(1);
  });

  it('never touches the API, other sites or anything that is not a GET', () => {
    const sw = load();

    expect(sw.handle(get('https://app.test/api/vendor/rental-contracts/5/permit'))).toBeUndefined();
    expect(sw.handle(get('https://api.example.com/api/auth/login'))).toBeUndefined();
    expect(sw.handle(get('https://fonts.gstatic.com/s/x.woff2'))).toBeUndefined();
    expect(
      sw.handle({
        url: 'https://app.test/assets/x.js',
        method: 'POST',
        mode: 'cors',
      } as unknown as Request),
    ).toBeUndefined();
    expect(sw.net.fetch).not.toHaveBeenCalled();
    expect(sw.stores.size).toBe(0);
  });

  it('takes over at once and drops the caches of an older version', async () => {
    const sw = load();
    await sw.sandbox.caches.open('streetbiz-shell-v0');
    await sw.sandbox.caches.open('someone-elses-cache');
    sw.handlers.install!({});
    expect(sw.sandbox.self.skipWaiting).toHaveBeenCalled();

    let done: Promise<unknown> = Promise.resolve();
    sw.handlers.activate!({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;

    expect([...sw.stores.keys()]).toEqual(['someone-elses-cache']);
    expect(sw.sandbox.self.clients.claim).toHaveBeenCalled();
  });

  it('has an emergency version that removes itself and its caches', async () => {
    const kill = readFileSync(resolve(__dirname, '../../scripts/sw-kill.js'), 'utf8');
    const deleted: string[] = [];
    const unregister = vi.fn();
    const navigate = vi.fn();
    const handlers: Record<string, (event: unknown) => void> = {};
    vm.runInNewContext(kill, {
      self: {
        addEventListener: (type: string, fn: (event: unknown) => void) => (handlers[type] = fn),
        skipWaiting: vi.fn(),
        registration: { unregister },
        clients: { matchAll: async () => [{ url: 'https://app.test/', navigate }] },
      },
      caches: {
        keys: async () => ['streetbiz-shell-v1', 'other'],
        delete: async (n: string) => void deleted.push(n),
      },
    });

    let done: Promise<unknown> = Promise.resolve();
    handlers.activate!({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;

    expect(deleted).toEqual(['streetbiz-shell-v1']);
    expect(unregister).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('https://app.test/');
  });

  it('ships a manifest the browser can install from', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(__dirname, '../../public/manifest.webmanifest'), 'utf8'),
    );
    expect(manifest).toMatchObject({
      display: 'standalone',
      start_url: '/',
      scope: '/',
      theme_color: '#CF4A0B',
    });
    const sizes = manifest.icons.map(
      (i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`,
    );
    expect(sizes).toEqual(
      expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']),
    );
    for (const icon of manifest.icons)
      expect(() =>
        readFileSync(resolve(__dirname, '../../public', icon.src.slice(1))),
      ).not.toThrow();
  });
});

describe('the permit screen with no signal', () => {
  const contract = {
    contractId: 5,
    slotId: 14,
    slotCode: 'NVL-14',
    zoneName: 'Đường Nguyễn Văn Linh',
    startDate: '2026-09-01',
    endDate: '2027-12-01',
    contractStatus: 'ACTIVE',
  } as RentalContract;
  const serverPermit = {
    permitId: 9,
    contractId: 5,
    qrPayload: 'SBP1.abc.def',
    startDate: '2026-09-01',
    endDate: '2027-12-01',
    permitStatus: 'ACTIVE',
    contractStatus: 'ACTIVE',
    effectiveStatus: 'VALID',
  };

  function open() {
    useAuthStore.setState({
      user: {
        id: '7',
        fullName: 'Hộ A',
        phone: '0905000001',
        role_code: 'VENDOR',
        account_status: 'ACTIVE',
      } as never,
    });
    return render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/vendor/slots/contracts/5/permit']}>
          <Routes>
            <Route path="/vendor/slots/contracts/:id/permit" element={<DigitalPermitScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.resetAllMocks();
    api.getContract.mockResolvedValue(contract);
  });

  it('keeps a copy every time the permit is read with a connection', async () => {
    api.getPermit.mockResolvedValue(serverPermit);
    open();

    await screen.findByText('HỢP LỆ');
    await waitFor(() =>
      expect(loadOfflinePermit('7', 5)).toMatchObject({
        qrPayload: 'SBP1.abc.def',
        slotCode: 'NVL-14',
        effectiveStatus: 'VALID',
      }),
    );
  });

  it('shows the saved permit, with its QR and when it was read, when the server cannot be reached', async () => {
    saveOfflinePermit('7', permit({ savedAt: Date.parse('2026-11-18T00:42:00Z') }));
    api.getPermit.mockRejectedValue(
      new ApiError('network_error', 0, 'Không kết nối được máy chủ.'),
    );
    api.getContract.mockRejectedValue(
      new ApiError('network_error', 0, 'Không kết nối được máy chủ.'),
    );
    open();

    expect(
      await screen.findByText(/Đang mất mạng: đây là bản đã lưu lúc 07:42 18\/11/),
    ).toBeInTheDocument();
    expect(screen.getByText('NVL-14')).toBeInTheDocument();
    expect(screen.getByText('HỢP LỆ')).toBeInTheDocument();
    expect(screen.getByText('SBP1.abc.def')).toBeInTheDocument();
    expect(screen.getByText(/Bản lưu lúc 07:42 18\/11, đang mất mạng/)).toBeInTheDocument();
    // The days left are not drawn as live data.
    expect(screen.queryByText(/Lấy từ máy chủ lúc/)).not.toBeInTheDocument();
  });

  it('shows a saved "valid" permit as expired once its last day has passed', async () => {
    saveOfflinePermit('7', permit({ endDate: '2026-01-01' }));
    api.getPermit.mockRejectedValue(new ApiError('network_error', 0, 'x'));
    api.getContract.mockRejectedValue(new ApiError('network_error', 0, 'x'));
    open();

    expect(await screen.findByText('Giấy phép này hiện không có hiệu lực.')).toBeInTheDocument();
    expect(screen.getByText('HẾT HẠN')).toBeInTheDocument();
  });

  it('asks to open the permit once with a connection when nothing was saved', async () => {
    api.getPermit.mockRejectedValue(new ApiError('network_error', 0, 'x'));
    open();

    expect(await screen.findByText(/máy chưa lưu giấy phép này/)).toBeInTheDocument();
  });

  it('shows the server answer, not the saved copy, when the server does answer with an error', async () => {
    saveOfflinePermit('7', permit());
    api.getPermit.mockRejectedValue(new SideApiError(404, 'Giấy phép không tồn tại.'));
    open();

    expect(await screen.findByText('Giấy phép không tồn tại.')).toBeInTheDocument();
    expect(screen.queryByText('SBP1.abc.def')).not.toBeInTheDocument();
  });

  it('does not show another user a copy saved by someone else on the same phone', async () => {
    saveOfflinePermit('99', permit());
    api.getPermit.mockRejectedValue(new ApiError('network_error', 0, 'x'));
    open();

    expect(await screen.findByText(/máy chưa lưu giấy phép này/)).toBeInTheDocument();
    expect(screen.queryByText('SBP1.abc.def')).not.toBeInTheDocument();
  });
});
