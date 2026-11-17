import { afterEach, describe, expect, it, vi } from 'vitest';

import { screenshotPng } from '@/features/assistant/assistant-image';

/** A file of the given type and size; the bytes do not matter, decoding is stubbed. */
function file(type: string, size = 1_000): File {
  return new File([new Uint8Array(size)], 'shot', { type });
}

function stubBitmap(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }));
  return close;
}

function stubCanvas(dataUrl = 'data:image/png;base64,QUJD') {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(dataUrl);
  return drawImage;
}

describe('assistant screenshot (the photo a user asks about)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(['image/gif', 'application/pdf', 'image/svg+xml'])('refuses %s', async (type) => {
    await expect(screenshotPng(file(type))).rejects.toThrow('Chọn ảnh PNG/JPEG/WebP không quá 5 MB.');
  });

  it('refuses a file over 5 MB', async () => {
    await expect(screenshotPng(file('image/png', 5 * 1024 * 1024 + 1))).rejects.toThrow('không quá 5 MB');
  });

  it('says so when the browser cannot decode images', async () => {
    vi.stubGlobal('createImageBitmap', undefined);

    await expect(screenshotPng(file('image/png'))).rejects.toThrow('Trình duyệt chưa hỗ trợ đọc ảnh');
  });

  it('says so when the file is not a readable image', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')));

    await expect(screenshotPng(file('image/jpeg'))).rejects.toThrow('Không đọc được ảnh');
  });

  it('refuses a canvas over 24 megapixels and still frees the bitmap', async () => {
    const close = stubBitmap(6_000, 5_000);

    await expect(screenshotPng(file('image/png'))).rejects.toThrow('Ảnh quá lớn');
    expect(close).toHaveBeenCalled();
  });

  it('scales the longest edge to 1280 px and returns the PNG base64 only', async () => {
    const close = stubBitmap(2_560, 1_440);
    const drawImage = stubCanvas('data:image/png;base64,QUJD');

    const base64 = await screenshotPng(file('image/webp'));

    expect(base64).toBe('QUJD');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 720);
    expect(close).toHaveBeenCalled();
  });

  it('never enlarges a small screenshot', async () => {
    stubBitmap(400, 300);
    const drawImage = stubCanvas();

    await screenshotPng(file('image/png'));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 300);
  });

  it('refuses a result still too large to send', async () => {
    stubBitmap(1_000, 1_000);
    stubCanvas(`data:image/png;base64,${'A'.repeat(2_800_001)}`);

    await expect(screenshotPng(file('image/png'))).rejects.toThrow('Ảnh vẫn quá lớn');
  });
});
