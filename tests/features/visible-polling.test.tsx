import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisiblePolling } from '@/hooks/useVisiblePolling';

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useVisiblePolling', () => {
  it('refreshes on every interval while the tab is visible', () => {
    const refresh = vi.fn();
    renderHook(() => useVisiblePolling(refresh, 1000));

    vi.advanceTimersByTime(3000);

    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('does not refresh while the tab is hidden, and catches up once when it is shown again', () => {
    const refresh = vi.fn();
    renderHook(() => useVisiblePolling(refresh, 1000));

    setVisibility('hidden');
    vi.advanceTimersByTime(5000);
    expect(refresh).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh on return from a very short absence', () => {
    const refresh = vi.fn();
    renderHook(() => useVisiblePolling(refresh, 1000));

    setVisibility('hidden');
    vi.advanceTimersByTime(200);
    setVisibility('visible');

    expect(refresh).not.toHaveBeenCalled();
  });

  it('calls the latest callback, and stops when disabled or unmounted', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ cb }) => useVisiblePolling(cb, 1000), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });

    vi.advanceTimersByTime(1000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    vi.advanceTimersByTime(5000);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', () => {
    const refresh = vi.fn();
    renderHook(() => useVisiblePolling(refresh, 1000, false));

    vi.advanceTimersByTime(5000);

    expect(refresh).not.toHaveBeenCalled();
  });
});
