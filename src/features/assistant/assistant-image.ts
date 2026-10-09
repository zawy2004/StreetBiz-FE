/** Decode locally, resize and export a minimal PNG. Original file metadata is never uploaded. */
export async function screenshotPng(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('Chọn ảnh PNG/JPEG/WebP không quá 5 MB.');
  if (typeof createImageBitmap !== 'function')
    throw new Error('Trình duyệt chưa hỗ trợ đọc ảnh. Hãy dùng trình duyệt được cập nhật.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Không đọc được ảnh. Hãy chọn ảnh PNG/JPEG/WebP khác.');
  }
  try {
    if (bitmap.width * bitmap.height > 24_000_000)
      throw new Error('Ảnh quá lớn. Hãy cắt phần nội dung cần hỏi.');
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/png').split(',')[1]!;
    if (base64.length > 2_800_000)
      throw new Error('Ảnh vẫn quá lớn. Hãy cắt phần cần hỏi trước khi gửi.');
    return base64;
  } finally {
    bitmap.close();
  }
}
