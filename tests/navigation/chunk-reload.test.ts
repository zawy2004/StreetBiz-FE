import { afterEach, describe, expect, it, vi } from 'vitest';

import { reloadOnStaleChunk } from '@/core/routing/chunk-reload';

function fakeWindow() {
  const target = new EventTarget() as EventTarget & Window;
  const store = new Map<string, string>();
  const reload = vi.fn();
  Object.assign(target, {
    location: { reload },
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  });
  return { target, reload };
}

const staleChunk = () => new Event('vite:preloadError', { cancelable: true });

describe('reloadOnStaleChunk', () => {
  let stop: (() => void) | undefined;
  afterEach(() => stop?.());

  it('reloads the page when a chunk from an older deploy fails to load', () => {
    const { target, reload } = fakeWindow();
    stop = reloadOnStaleChunk(target, () => 1_000_000);

    const event = staleChunk();
    target.dispatchEvent(event);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not reload again within a minute, so a broken chunk cannot loop', () => {
    const { target, reload } = fakeWindow();
    let now = 1_000_000;
    stop = reloadOnStaleChunk(target, () => now);

    target.dispatchEvent(staleChunk());
    now += 30_000;
    const second = staleChunk();
    target.dispatchEvent(second);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);

    now += 31_000;
    target.dispatchEvent(staleChunk());
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('stops listening once removed', () => {
    const { target, reload } = fakeWindow();
    reloadOnStaleChunk(target, () => 1_000_000)();

    target.dispatchEvent(staleChunk());

    expect(reload).not.toHaveBeenCalled();
  });
});
