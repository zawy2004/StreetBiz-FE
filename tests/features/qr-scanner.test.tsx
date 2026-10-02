import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { SCAN_INTERVAL_MS, SCAN_REARM_MS } from '@/features/orders/components/qr-scan-support';

// What the "camera" shows on the next decoded frame: a code, or nothing.
const lens = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('jsqr', () => ({
  default: () => (lens.value ? { data: lens.value } : null),
}));

const { QrScanner } = await import('@/features/orders/components/QrScanner');

const CODE = 'SBO1.DwAAAAAAAAAHAAAAAAAAAA.abcdef0123456789';

/** Lets the capture loop run for `ms` of fake time. */
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

describe('QrScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lens.value = null;
    // jsdom has no camera, no video frames and no 2D canvas.
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(640);
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(480);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: () => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports a code held in front of it once, not on every frame', async () => {
    const onDetected = vi.fn();
    render(<QrScanner onDetected={onDetected} />);
    lens.value = CODE;
    await advance(SCAN_INTERVAL_MS * 20);
    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected).toHaveBeenCalledWith(CODE);
  });

  it('does not resubmit a code that only blurs out for a moment', async () => {
    const onDetected = vi.fn();
    render(<QrScanner onDetected={onDetected} />);
    lens.value = CODE;
    await advance(SCAN_INTERVAL_MS * 3);
    lens.value = null;
    await advance(SCAN_INTERVAL_MS * 2);
    lens.value = CODE;
    await advance(SCAN_INTERVAL_MS * 3);
    expect(onDetected).toHaveBeenCalledTimes(1);
  });

  // The seller scans before marking the order ready, is told it is not ready,
  // marks it ready and holds the same phone up again.
  it('reads the same code again once it has been taken away and shown again', async () => {
    const onDetected = vi.fn();
    render(<QrScanner onDetected={onDetected} />);
    lens.value = CODE;
    await advance(SCAN_INTERVAL_MS * 3);
    lens.value = null;
    await advance(SCAN_REARM_MS + SCAN_INTERVAL_MS * 3);
    lens.value = CODE;
    await advance(SCAN_INTERVAL_MS * 3);
    expect(onDetected).toHaveBeenCalledTimes(2);
  });

  // A phone opening the dev server by LAN address: the browser hides the camera.
  it('blames plain http, not the device, when the browser hides the camera', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    vi.stubGlobal('isSecureContext', false);
    const view = render(<QrScanner onDetected={vi.fn()} />);
    expect(view.getByText(/chỉ cho mở camera trên trang HTTPS/)).toBeInTheDocument();
  });

  it('decodes nothing while paused', async () => {
    const onDetected = vi.fn();
    const view = render(<QrScanner onDetected={onDetected} paused />);
    lens.value = CODE;
    await advance(SCAN_INTERVAL_MS * 10);
    expect(onDetected).not.toHaveBeenCalled();
    view.rerender(<QrScanner onDetected={onDetected} />);
    await advance(SCAN_INTERVAL_MS * 2);
    expect(onDetected).toHaveBeenCalledTimes(1);
  });
});
