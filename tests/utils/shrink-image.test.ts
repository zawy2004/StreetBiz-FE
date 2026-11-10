import { afterEach, describe, expect, it, vi } from 'vitest';

import { PUBLIC_PHOTO_MAX_SIDE, shrinkImage } from '@/core/utils/shrink-image';

type Drawn = { width: number; height: number; type?: string; quality?: number };

/** A fake browser: bitmaps of a given size, a canvas that "encodes" to `outputSize` bytes. */
function fakeBrowser({
  width,
  height,
  outputSize,
  outputType,
  failDecode = false,
}: {
  width: number;
  height: number;
  outputSize: number;
  outputType?: string;
  failDecode?: boolean;
}) {
  const drawn: Drawn[] = [];
  const close = vi.fn();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => {
      if (failDecode) throw new Error('decode');
      return { width, height, close } as unknown as ImageBitmap;
    }),
  );
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return {
          fillRect: vi.fn(),
          drawImage: vi.fn(),
          fillStyle: '',
          imageSmoothingEnabled: false,
        };
      }
      async convertToBlob({ type, quality }: { type: string; quality: number }) {
        drawn.push({ width: this.width, height: this.height, type, quality });
        return new Blob([new Uint8Array(outputSize)], { type: outputType ?? type });
      }
    },
  );
  return { drawn, close };
}

const photo = (size: number, type = 'image/jpeg', name = 'mon.jpg') =>
  new File([new Uint8Array(size)], name, { type, lastModified: 1 });

afterEach(() => vi.unstubAllGlobals());

describe('shrinkImage', () => {
  it('scales a large phone photo down to the longest-edge limit, keeping the aspect ratio', async () => {
    const { drawn, close } = fakeBrowser({ width: 4000, height: 3000, outputSize: 300_000 });

    const result = await shrinkImage(photo(4_000_000));

    expect(drawn).toEqual([
      { width: PUBLIC_PHOTO_MAX_SIDE, height: 1200, type: 'image/jpeg', quality: 0.82 },
    ]);
    expect(result.size).toBe(300_000);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('mon.jpg');
    expect(close).toHaveBeenCalled();
  });

  it('keeps a portrait photo upright and within the limit on its long edge', async () => {
    const { drawn } = fakeBrowser({ width: 3000, height: 4000, outputSize: 200_000 });

    await shrinkImage(photo(3_000_000));

    expect(drawn[0]).toMatchObject({ width: 1200, height: PUBLIC_PHOTO_MAX_SIDE });
    expect(createImageBitmap).toHaveBeenCalledWith(expect.any(File), {
      imageOrientation: 'from-image',
    });
  });

  it('does not enlarge a small photo', async () => {
    const { drawn } = fakeBrowser({ width: 800, height: 600, outputSize: 50_000 });

    await shrinkImage(photo(120_000));

    expect(drawn[0]).toMatchObject({ width: 800, height: 600 });
  });

  it('keeps the original when re-encoding would not make it smaller', async () => {
    fakeBrowser({ width: 800, height: 600, outputSize: 200_000 });
    const original = photo(150_000);

    expect(await shrinkImage(original)).toBe(original);
  });

  it('keeps the original when the browser cannot write the format (Safari and WEBP)', async () => {
    fakeBrowser({ width: 4000, height: 3000, outputSize: 100_000, outputType: 'image/png' });
    const original = photo(4_000_000, 'image/webp', 'mon.webp');

    expect(await shrinkImage(original)).toBe(original);
  });

  it('keeps the original when the photo cannot be decoded', async () => {
    fakeBrowser({ width: 0, height: 0, outputSize: 0, failDecode: true });
    const original = photo(4_000_000);

    expect(await shrinkImage(original)).toBe(original);
  });

  it('leaves anything that is not a JPG, PNG or WEBP alone', async () => {
    const { drawn } = fakeBrowser({ width: 4000, height: 3000, outputSize: 1 });
    const pdf = photo(4_000_000, 'application/pdf', 'giay.pdf');

    expect(await shrinkImage(pdf)).toBe(pdf);
    expect(drawn).toHaveLength(0);
  });

  it('keeps the original in a browser without createImageBitmap', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const original = photo(4_000_000);

    expect(await shrinkImage(original)).toBe(original);
  });
});
