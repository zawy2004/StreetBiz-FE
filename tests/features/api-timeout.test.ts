import { AxiosError, type AxiosAdapter } from 'axios';

import { ApiError, apiPost, http } from '@/core/api';

/**
 * An eKYC call that outlived the client timeout used to say "Không kết nối được máy chủ" -- the
 * server was only slow. A timeout is now its own error; a real connection failure is unchanged.
 */
describe('client timeouts', () => {
  const original = http.defaults.adapter;
  afterEach(() => {
    http.defaults.adapter = original;
  });

  const failWith = (code: string) => {
    const adapter: AxiosAdapter = async (config) =>
      Promise.reject(new AxiosError('failed', code, config));
    http.defaults.adapter = adapter;
  };

  it.each([AxiosError.ECONNABORTED, AxiosError.ETIMEDOUT])(
    'reports %s as a slow server',
    async (code) => {
      failWith(code);

      const error = await apiPost('/vendor/kyc/id-card', {}).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('timeout');
      expect((error as ApiError).message).toMatch(/quá lâu/);
    },
  );

  it('still reports a connection failure as one', async () => {
    failWith(AxiosError.ERR_NETWORK);

    const error = await apiPost('/vendor/kyc/id-card', {}).catch((e: unknown) => e);

    expect((error as ApiError).code).toBe('network_error');
  });
});
