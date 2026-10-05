import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const axiosPost = vi.hoisted(() => vi.fn());
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: Object.assign(actual.default, { post: axiosPost }) };
});

const { scheduleTokenRefresh, cancelTokenRefresh } = await import('@/core/api/client');
const { setTokens, getTokens, clearTokens } = await import('@/core/api/token-storage');

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  axiosPost.mockReset();
  axiosPost.mockImplementation(async () => ({
    data: { accessToken: 'new-access', refreshToken: 'new-refresh', accessTokenExpiresAtUtc: inMinutes(60) },
  }));
  setTokens({ accessToken: 'old', refreshToken: 'r1', accessTokenExpiresAtUtc: inMinutes(10) });
});

afterEach(() => {
  cancelTokenRefresh();
  clearTokens();
  vi.useRealTimers();
});

describe('proactive token refresh', () => {
  it('refreshes about a minute before the access token expires, not before', async () => {
    scheduleTokenRefresh();

    await vi.advanceTimersByTimeAsync(8 * 60_000);
    expect(axiosPost).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(getTokens()?.accessToken).toBe('new-access');
  });

  it('schedules the next refresh from the new expiry', async () => {
    scheduleTokenRefresh();
    await vi.advanceTimersByTimeAsync(9 * 60_000);
    expect(axiosPost).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(58 * 60_000);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(axiosPost).toHaveBeenCalledTimes(2);
  });

  it('does nothing once cancelled (signed out)', async () => {
    scheduleTokenRefresh();
    cancelTokenRefresh();

    await vi.advanceTimersByTimeAsync(30 * 60_000);

    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('does nothing without tokens', async () => {
    clearTokens();
    scheduleTokenRefresh();

    await vi.advanceTimersByTimeAsync(30 * 60_000);

    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('survives a failed refresh without throwing; the next 401 handles a dead session', async () => {
    axiosPost.mockRejectedValue(new Error('network'));
    scheduleTokenRefresh();

    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
});
