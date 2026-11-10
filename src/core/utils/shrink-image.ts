/**
 * Makes a public photo (a dish, a sidewalk slot) small before it is uploaded: at most
 * `maxSide` pixels on the long edge, re-encoded in the same format. A phone photo of
 * 3–8 MB becomes a few hundred KB, so the upload is quick on mobile data, the menu loads
 * faster for buyers, and the re-encoding drops the EXIF block (GPS, device) on the way.
 *
 * It never makes things worse: any file it cannot handle (another type, an old browser,
 * a decode error, a browser that cannot encode this format) and any result that is not
 * smaller comes back as the original file, which the server checks as before.
 *
 * Not for evidence files: those are records and are uploaded exactly as taken.
 */
export type ShrinkOptions = {
  /** Longest edge in pixels. */
  maxSide?: number;
  /** JPEG/WEBP quality, 0–1. */
  quality?: number;
};

const SHRINKABLE = ['image/jpeg', 'image/png', 'image/webp'];

export const PUBLIC_PHOTO_MAX_SIDE = 1600;

export async function shrinkImage(
  file: File,
  { maxSide = PUBLIC_PHOTO_MAX_SIDE, quality = 0.82 }: ShrinkOptions = {},
): Promise<File> {
  if (!SHRINKABLE.includes(file.type) || typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap | undefined;
  try {
    // 'from-image' applies the EXIF rotation, so a portrait photo stays upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const blob = await draw(bitmap, width, height, file.type, quality);
    // A browser that cannot write this format hands back a PNG instead; keep the original.
    if (!blob || blob.type !== file.type || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

async function draw(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  type: string,
  quality: number,
): Promise<Blob | null> {
  if (typeof OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) return null;
    paint(context, bitmap, width, height, type);
    return canvas.convertToBlob({ type, quality });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  paint(context, bitmap, width, height, type);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function paint(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  type: string,
) {
  // JPEG has no transparency: paint white under it instead of letting it turn black.
  if (type === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
}
