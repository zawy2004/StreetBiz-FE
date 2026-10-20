import type { AxiosAdapter } from 'axios';

import { apiGet, http } from '@/core/api/client';

/**
 * The backend answers `Ok(null)` for every `T?` endpoint (an empty cart, an
 * absent contract, ...), which ASP.NET renders as 204 No Content. Axios reports
 * that empty body as "", and "" is not nullish - so `data?.field.length` walks
 * past the optional chain and throws. This is the transport-level guard.
 */
describe('empty response bodies', () => {
  const original = http.defaults.adapter;
  const respondWith = (status: number, data: unknown) => {
    const adapter: AxiosAdapter = async (config) => ({
      data,
      status,
      statusText: '',
      headers: {},
      config,
    });
    http.defaults.adapter = adapter;
  };

  afterEach(() => {
    http.defaults.adapter = original;
  });

  it('reads a 204 No Content as null rather than an empty string', async () => {
    respondWith(204, '');
    await expect(apiGet('/cart')).resolves.toBeNull();
  });

  it('leaves a real payload untouched', async () => {
    respondWith(200, { cartId: 3, items: [] });
    await expect(apiGet('/cart')).resolves.toEqual({ cartId: 3, items: [] });
  });

  it('keeps optional chaining meaningful for the caller', async () => {
    respondWith(204, '');
    const cart = await apiGet<{ items: unknown[] } | null>('/cart');
    expect(cart?.items).toBeUndefined();
  });
});
